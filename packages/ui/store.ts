"use client";
import { create } from "zustand";
import { snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { outbox, type PendingWrite } from "../storage-core/outbox";
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
  localSaved: boolean;
  error: string | null;
  localError: string | null;
  history: Snapshot[];
  future: Snapshot[];
  conflict: { remote: Snapshot; fields: Conflict[] } | null;
  open: (
    data: Snapshot,
    repo: Repository | null,
    demo?: boolean,
  ) => Promise<void>;
  close: () => void;
  prepareSwitch: () => Promise<boolean>;
  mutate: (fn: (s: Snapshot) => void, recordHistory?: boolean) => void;
  persist: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  resolve: (choice: "local" | "remote") => Promise<void>;
  refresh: () => Promise<void>;
};
export const useNetwork = create<State>((set, get) => {
  let epoch = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  let firstEdit = 0,
    failures = 0;
  let flight: Promise<void> | null = null;
  let refreshing = false;
  let journal: { id: string; scope: string } | null = null;
  let record: PendingWrite | null = null;
  let activeScope: string | null = null;
  let localQueue: Promise<unknown> = Promise.resolve();
  const checkpoint = () => {
    const s = get(),
      generation = epoch,
      target = journal;
    if (!s.data || !s.base || s.demo || !target) return Promise.resolve(true);
    const entry: PendingWrite = {
      ...target,
      version: crypto.randomUUID(),
      base: s.base,
      data: s.data,
    };
    set({ localSaved: false });
    const task = localQueue
      .catch(() => {})
      .then(async () => {
        try {
          await outbox.put(entry);
          if (generation === epoch) {
            record = entry;
            if (get().data === s.data)
              set({ localSaved: true, localError: null });
          }
          return true;
        } catch {
          if (generation === epoch)
            set({ localSaved: false, localError: "localSaveFailed" });
          return false;
        }
      });
    localQueue = task;
    return task;
  };
  const schedule = () => {
    if (get().demo) {
      set({ dirty: false });
      return;
    }
    void checkpoint();
    if (!firstEdit) firstEdit = Date.now();
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        firstEdit = 0;
        void get().persist();
      },
      Math.min(
        get().repo?.shared ? 300 : 800,
        Math.max(
          0,
          (get().repo?.shared ? 1200 : 4000) - (Date.now() - firstEdit),
        ),
      ),
    );
  };
  const finishDetached = async (
    repo: Repository,
    entry: PendingWrite,
    previousFlight: Promise<void> | null,
  ) => {
    // A network switch must not cancel a durable write to the previous network.
    try {
      await previousFlight;
      for (let attempt = 0; attempt < 3; attempt++) {
        const isActive = () => activeScope === entry.scope;
        if (isActive()) return;
        const remote = await repo.load();
        if (isActive()) return;
        const merged = mergeSnapshots(entry.base, entry.data, remote);
        if (merged.conflicts.length) return;
        try {
          await repo.save(merged.value, remote.revision);
          await outbox.remove(entry);
          return;
        } catch (error) {
          if (!(error instanceof ConflictError)) return;
        }
      }
    } catch {
      // The durable journal remains available for recovery on the next open.
    }
  };
  const reset = () => {
    const previous = get();
    if (
      previous.dirty &&
      previous.localSaved &&
      previous.repo &&
      record &&
      !previous.conflict
    )
      void finishDetached(previous.repo, record, flight);
    ++epoch;
    clearTimeout(timer);
    firstEdit = 0;
    failures = 0;
    flight = null;
    journal = null;
    activeScope = null;
    record = null;
    localQueue = Promise.resolve();
  };
  return {
    data: null,
    base: null,
    repo: null,
    demo: false,
    dirty: false,
    saving: false,
    localSaved: false,
    error: null,
    localError: null,
    history: [],
    future: [],
    conflict: null,
    open: async (remote, repo, demo = false) => {
      reset();
      const generation = epoch;
      const scope =
        !demo && !repo?.readOnly && repo?.journalScope && remote.ownerId
          ? repo.journalScope + ":" + remote.ownerId
          : null;
      activeScope = scope;
      let data = remote,
        conflict: State["conflict"] = null;
      let pending: PendingWrite[] = [];
      const recoveredConflicts: Conflict[] = [];
      if (scope) {
        pending = await outbox.list(scope);
        if (generation !== epoch) return;
        for (const entry of pending) {
          const merged = mergeSnapshots(entry.base, entry.data, data);
          data = merged.value;
          recoveredConflicts.push(...merged.conflicts);
          if (merged.conflicts.length)
            conflict = {
              remote,
              fields: recoveredConflicts,
            };
        }
        journal = { scope, id: crypto.randomUUID() };
      }
      set({
        data,
        base: structuredClone(remote),
        repo,
        demo,
        dirty:
          !repo?.readOnly &&
          (pending.length > 0 || Boolean(repo?.requiresMigration)),
        saving: false,
        localSaved: false,
        error: null,
        localError: null,
        history: [],
        future: [],
        conflict,
      });
      if (
        !repo?.readOnly &&
        (pending.length || repo?.requiresMigration) &&
        (await checkpoint())
      ) {
        for (const entry of pending) await outbox.remove(entry);
        if (generation === epoch && !conflict) schedule();
      }
    },
    prepareSwitch: async () => {
      if (get().conflict) return false;
      return get().dirty ? checkpoint() : true;
    },
    close: () => {
      reset();
      set({
        data: null,
        base: null,
        repo: null,
        dirty: false,
        saving: false,
        conflict: null,
        localSaved: false,
        error: null,
        localError: null,
      });
    },
    mutate: (fn, recordHistory = true) => {
      const s = get();
      if (!s.data || s.conflict || s.repo?.readOnly) return;
      try {
        const next = structuredClone(s.data);
        fn(next);
        next.preferences.lastEditedAt = new Date().toISOString();
        set({
          data: snapshotSchema.parse(next),
          history: recordHistory
            ? [...s.history.slice(-29), s.data]
            : s.history,
          future: recordHistory ? [] : s.future,
          dirty: true,
        });
        schedule();
      } catch {
        set({ error: "invalidData" });
      }
    },
    persist: () => {
      clearTimeout(timer);
      firstEdit = 0;
      if (flight) return flight;
      const generation = epoch;
      if (
        !get().dirty ||
        get().conflict ||
        !get().repo ||
        get().demo ||
        get().repo?.readOnly
      )
        return Promise.resolve();
      set({ saving: true, error: null });
      flight = (async () => {
        let conflicts = 0;
        while (generation === epoch && get().dirty && !get().conflict) {
          if (!(await checkpoint())) break;
          if (generation !== epoch) break;
          const s = get();
          if (!s.data || !s.base || !s.repo) break;
          try {
            const saved = await s.repo.save(s.data, s.base.revision);
            s.repo.requiresMigration = false;
            if (generation !== epoch) break;
            const latest = get().data!;
            const data =
              latest === s.data
                ? saved
                : mergeSnapshots(s.data, latest, saved).value;
            set({
              data,
              base: structuredClone(saved),
              dirty: latest !== s.data,
              error: null,
            });
            failures = 0;
            conflicts = 0;
            if (get().dirty) await checkpoint();
            else {
              const acknowledged = record;
              const removal = localQueue
                .catch(() => {})
                .then(async () => {
                  if (acknowledged) await outbox.remove(acknowledged);
                });
              localQueue = removal;
              await removal;
            }
          } catch (e) {
            if (generation !== epoch) break;
            if (e instanceof ConflictError) {
              const merged = mergeSnapshots(s.base, get().data!, e.remote);
              if (!merged.conflicts.length && ++conflicts <= 3) {
                set({
                  data: merged.value,
                  base: structuredClone(e.remote),
                  dirty: true,
                });
                continue;
              }
              set({ conflict: { remote: e.remote, fields: merged.conflicts } });
            } else {
              const error = e instanceof Error ? e.message : "storageError";
              set({ error });
              if (
                ![
                  "driveExpired",
                  "drivePermission",
                  "sharedReadOnly",
                  "sharedAccessLost",
                  "driveNotFound",
                  "driveSharingPermission",
                  "driveAccountChanged",
                  "folderPermission",
                  "invalidData",
                  "tooLarge",
                ].includes(error)
              ) {
                timer = setTimeout(
                  () => void get().persist(),
                  Math.min(30000, 2000 * 2 ** failures++),
                );
              }
            }
            break;
          }
        }
      })().finally(() => {
        if (generation === epoch) {
          flight = null;
          set({ saving: false });
        }
      });
      return flight;
    },
    undo: () => {
      const s = get();
      if (!s.data || !s.history.length || s.conflict || s.repo?.readOnly)
        return;
      const restored = structuredClone(s.history.at(-1)!);
      restored.counters = { ...s.data.counters };
      restored.preferences.lastEditedAt = new Date().toISOString();
      set({
        data: restored,
        history: s.history.slice(0, -1),
        future: [s.data, ...s.future],
        dirty: true,
      });
      schedule();
    },
    redo: () => {
      const s = get();
      if (!s.data || !s.future.length || s.conflict || s.repo?.readOnly) return;
      const restored = structuredClone(s.future[0]);
      restored.counters = { ...s.data.counters };
      restored.preferences.lastEditedAt = new Date().toISOString();
      set({
        data: restored,
        history: [...s.history, s.data],
        future: s.future.slice(1),
        dirty: true,
      });
      schedule();
    },
    resolve: async (choice) => {
      const s = get();
      if (!s.conflict || !s.repo || s.repo.readOnly) return;
      const generation = epoch;
      await s.repo.backup();
      if (generation !== epoch) return;
      set({
        data: choice === "remote" ? s.conflict.remote : s.data,
        base: structuredClone(s.conflict.remote),
        conflict: null,
        dirty: true,
        history: [],
        future: [],
      });
      await checkpoint();
      await get().persist();
    },
    refresh: async () => {
      const s = get(),
        generation = epoch;
      if (!s.repo || s.dirty || s.saving || s.conflict || refreshing) return;
      refreshing = true;
      try {
        const wasReadOnly = s.repo.readOnly;
        const remote = await s.repo.load();
        if (
          generation !== epoch ||
          get().dirty ||
          get().saving ||
          get().base !== s.base
        )
          return;
        if (get().error) set({ error: null });
        if (
          remote.revision !== s.base?.revision ||
          wasReadOnly !== s.repo.readOnly
        )
          set({
            error: null,
            data: remote,
            base: structuredClone(remote),
            history: [],
            future: [],
          });
      } catch (e) {
        if (generation === epoch)
          set({ error: e instanceof Error ? e.message : "storageError" });
      } finally {
        refreshing = false;
      }
    },
  };
});
