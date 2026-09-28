"use client";
import { create } from "zustand";
import { snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import {
  ConflictError,
  mergeSnapshots,
  type Conflict,
} from "../sync-engine/merge";
type State = {
  data: Snapshot | null;
  base: Snapshot | null;
  repo: Repository | null;
  demo: boolean;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  history: Snapshot[];
  future: Snapshot[];
  conflict: { remote: Snapshot; fields: Conflict[] } | null;
  open: (data: Snapshot, repo: Repository | null, demo?: boolean) => void;
  mutate: (fn: (s: Snapshot) => void, recordHistory?: boolean) => void;
  persist: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  resolve: (choice: "local" | "remote") => Promise<void>;
  refresh: () => Promise<void>;
};
export const useNetwork = create<State>((set, get) => ({
  data: null,
  base: null,
  repo: null,
  demo: false,
  dirty: false,
  saving: false,
  error: null,
  history: [],
  future: [],
  conflict: null,
  open: (data, repo, demo = false) =>
    set({
      data,
      base: structuredClone(data),
      repo,
      demo,
      dirty: false,
      saving: false,
      error: null,
      history: [],
      future: [],
      conflict: null,
    }),
  mutate: (fn, recordHistory = true) => {
    const s = get();
    if (!s.data || s.conflict) return;
    const next = structuredClone(s.data);
    try {
      fn(next);
      const valid = snapshotSchema.parse(next);
      set({
        data: valid,
        history: recordHistory ? [...s.history.slice(-29), s.data] : s.history,
        future: recordHistory ? [] : s.future,
        dirty: true,
        error: null,
      });
      void get().persist();
    } catch {
      set({ error: "invalidData" });
    }
  },
  persist: async () => {
    const s = get();
    if (!s.data || s.saving || s.conflict) return;
    if (s.demo) {
      set({ dirty: false });
      return;
    }
    if (!s.repo || !s.base) return;
    set({ saving: true, error: null });
    try {
      const saved = await s.repo.save(s.data, s.base.revision);
      if (get().data === s.data)
        set({ data: saved, base: structuredClone(saved), dirty: false });
      else set({ base: structuredClone(saved) });
    } catch (e) {
      if (e instanceof ConflictError) {
        const local = get().data ?? s.data;
        const merged = mergeSnapshots(s.base, local, e.remote);
        if (merged.conflicts.length === 0) {
          try {
            const saved = await s.repo.save(merged.value, e.remote.revision);
            if (get().data === local)
              set({ data: saved, base: structuredClone(saved), dirty: false });
            else set({ base: structuredClone(saved) });
          } catch {
            set({ conflict: { remote: e.remote, fields: [] } });
          }
        } else
          set({ conflict: { remote: e.remote, fields: merged.conflicts } });
      } else set({ error: e instanceof Error ? e.message : "storageError" });
    } finally {
      set({ saving: false });
      const now = get();
      if (now.dirty && !now.error && !now.conflict) void now.persist();
    }
  },
  undo: () => {
    const s = get();
    if (!s.data || !s.history.length || s.saving || s.conflict) return;
    const restored = structuredClone(s.history.at(-1)!);
    restored.counters = { ...s.data.counters };
    set({
      data: restored,
      history: s.history.slice(0, -1),
      future: [s.data, ...s.future],
      dirty: true,
    });
    void get().persist();
  },
  redo: () => {
    const s = get();
    if (!s.data || !s.future.length || s.saving || s.conflict) return;
    const restored = structuredClone(s.future[0]);
    restored.counters = { ...s.data.counters };
    set({
      data: restored,
      history: [...s.history, s.data],
      future: s.future.slice(1),
      dirty: true,
    });
    void get().persist();
  },
  resolve: async (choice) => {
    const s = get();
    if (!s.conflict || !s.repo) return;
    await s.repo.backup();
    if (choice === "remote") {
      set({
        data: s.conflict.remote,
        base: structuredClone(s.conflict.remote),
        conflict: null,
        dirty: false,
        history: [],
        future: [],
      });
    } else {
      set({
        base: structuredClone(s.conflict.remote),
        conflict: null,
        dirty: true,
      });
      await get().persist();
    }
  },
  refresh: async () => {
    const s = get();
    if (!s.repo || s.dirty || s.saving || s.conflict) return;
    try {
      const remote = await s.repo.load();
      if (get().dirty || get().saving || get().base !== s.base) return;
      if (remote.revision !== s.base?.revision)
        set({
          data: remote,
          base: structuredClone(remote),
          history: [],
          future: [],
        });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "storageError" });
    }
  },
}));
