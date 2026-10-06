import { create } from "zustand";
import type { Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { BrowserRepository } from "../storage-adapters/indexeddb";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import type { GoogleSession } from "../storage-adapters/google-auth";
import {
  LocalRepository,
  HttpRepository,
  type Directory,
} from "../storage-adapters/browser";

export type NetworkEntry = {
  id: string;
  data: Snapshot;
  shared?: boolean;
  ownerLabel?: string;
  readOnly?: boolean;
};
export type NetworkLibrary = {
  provider: "browser" | "drive" | "local" | "server";
  multiple: boolean;
  session?: GoogleSession;
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
    ids: () => root.networkIds(),
    repository: (id) => new GoogleDriveRepository(root.session, id),
  };
}
export function folderLibrary(root: Directory): NetworkLibrary {
  return {
    provider: "local",
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
  connect: (library: NetworkLibrary, ownerName: string) => void;
  select: (id: string) => void;
}>((set) => ({
  library: null,
  ownerName: "",
  activeId: null,
  connect: (library, ownerName) => set({ library, ownerName, activeId: null }),
  select: (activeId) => set({ activeId }),
}));
