import { create } from "zustand";
import type { Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { BrowserRepository } from "../storage-adapters/indexeddb";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import type { GoogleSession } from "../storage-adapters/google-auth";
import {
  CachedDriveRepository,
  offlineNetworks,
} from "../storage-adapters/offline-repository";
import {
  LocalRepository,
  HttpRepository,
  type Directory,
} from "../storage-adapters/browser";

export type NetworkEntry = {
  id: string;
  preferences: Snapshot["preferences"];
  identity: string;
  peopleCount: number;
  connectionCount: number;
  modifiedAt: string;
  shared?: boolean;
  ownerLabel?: string;
  ownedByMe?: boolean;
  readOnly?: boolean;
};
export type NetworkLibrary = {
  provider: "browser" | "drive" | "local" | "server";
  multiple: boolean;
  session?: GoogleSession;
  directory?: Directory;
  ids(): Promise<string[]>;
  repository(id: string): Repository;
};
export function browserLibrary(): NetworkLibrary {
  return {
    provider: "browser",
    multiple: true,
    ids: () => new BrowserRepository().networkIds(),
    repository: (id) => new BrowserRepository(id),
  };
}
export function driveLibrary(root: GoogleDriveRepository): NetworkLibrary {
  return {
    provider: "drive",
    session: root.session,
    multiple: true,
    ids: async () => {
      const cached = await offlineNetworks.storage.list(root.session.accountId);
      try {
        return [
          ...new Set([
            ...(await root.networkIds()),
            ...cached.map((r) => r.network),
          ]),
        ];
      } catch (e) {
        if (cached.length) return cached.map((r) => r.network);
        throw e;
      }
    },
    repository: (id) => new CachedDriveRepository(root.session, id),
  };
}
export function folderLibrary(root: Directory): NetworkLibrary {
  return {
    provider: "local",
    directory: root,
    multiple: true,
    ids: () => new LocalRepository(root).networkIds(),
    repository: (id) => new LocalRepository(root, id),
  };
}
export function serverLibrary(): NetworkLibrary {
  return {
    provider: "server",
    multiple: false,
    ids: async () => ["default"],
    repository: () => new HttpRepository(),
  };
}
export const useLibrary = create<{
  library: NetworkLibrary | null;
  ownerName: string;
  activeId: string | null;
  seen: string[];
  animationId: string | null;
  requestEntry: (id: string) => void;
  finishEntry: () => void;
  connect: (library: NetworkLibrary, ownerName: string) => void;
  select: (id: string) => void;
}>((set) => ({
  library: null,
  ownerName: "",
  activeId: null,
  seen: [],
  animationId: null,
  requestEntry: (id) =>
    set((s) =>
      s.seen.includes(id) ? {} : { seen: [...s.seen, id], animationId: id },
    ),
  finishEntry: () => set({ animationId: null }),
  connect: (library, ownerName) =>
    set({ library, ownerName, activeId: null, seen: [], animationId: null }),
  select: (activeId) => set({ activeId }),
}));
