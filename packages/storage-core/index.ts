import { relationshipPalette, themePalette } from "../appearance/config";
import {
  snapshotSchema,
  needsPerspectiveMigration,
  type Snapshot,
} from "../domain/model";
export interface StorageMetadata {
  size: number;
  modifiedAt: string;
  etag?: string;
}
export interface StorageAdapter {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<StorageMetadata>;
}
export interface Repository {
  readonly readOnly?: boolean;
  readonly shared?: boolean;
  readonly journalScope?: string;
  requiresMigration?: boolean;
  load(): Promise<Snapshot>;
  save(value: Snapshot, expectedRevision: number): Promise<Snapshot>;
  backup(): Promise<string>;
  backups(): Promise<string[]>;
  restorePreview(id: string): Promise<Snapshot>;
}
export function safePath(path: string) {
  if (
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path
      .split("/")
      .some(
        (p) => !p || p === "." || p === ".." || !/^[a-zA-Z0-9_.-]+$/.test(p),
      )
  )
    throw new Error("invalidPath");
  return path;
}
export function fileTree(s: Snapshot): Record<string, string> {
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  return {
    ...Object.fromEntries(
      s.people.map((p) => [`Identities/${p.storageId}.json`, json(p)]),
    ),
    "sync/connections.json": json({
      schemaVersion: 1,
      connections: s.connections,
    }),
    "sync/counters.json": json(s.counters),
    "sync/index.json": json({
      schemaVersion: 1,
      identities: Object.fromEntries(
        s.people.map((p) => [
          p.id,
          {
            storageId: p.storageId,
            file: `Identities/${p.storageId}.json`,
            updatedAt: p.updatedAt,
            revision: p.revision,
          },
        ]),
      ),
    }),
    "sync/versions.json": json({ schemaVersion: 1, revision: s.revision }),
    "sync/tombstones.json": json(s.tombstones),
    "sync/layout.json": json(
      Object.fromEntries(s.people.map((p) => [p.id, p.display])),
    ),
    "sync/sync-state.json": json({
      revision: s.revision,
      deviceId: s.deviceId,
    }),
    "settings/preferences.json": json(s.preferences),
    "settings/relationship-colors.json": json({
      schemaVersion: 1,
      colors: relationshipPalette(s.preferences),
    }),
    "settings/themes.json": json({
      schemaVersion: 1,
      light: themePalette(s.preferences, false),
      dark: themePalette(s.preferences, true),
    }),
    "settings/feature-flags.json": json({ schemaVersion: 1 }),
    "settings/storage.json": json({
      schemaVersion: 1,
      containsCredentials: false,
    }),
    "sync/snapshot.json": json(s),
  };
}

export function parseStoredSnapshot(
  value: unknown,
  repo: { requiresMigration: boolean },
) {
  repo.requiresMigration ||= needsPerspectiveMigration(value);
  return snapshotSchema.parse(value);
}
