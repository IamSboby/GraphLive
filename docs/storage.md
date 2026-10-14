# Storage and backups

English · [Español](storage.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

Choose storage on `/login/`; the dashboard then manages multiple independent networks. Browser, folder, Google Drive and the optional Node server use repository interfaces, but do not provide identical guarantees.

- **Browser:** IndexedDB transactions and local backups. Data belongs to the current browser profile and origin. Clearing site data also removes the outbox, cache and local networks.
- **Folder:** File System Access permissions are required. Web Locks coordinate the same browser/origin, not external processes or other devices.
- **Drive:** private networks use appDataFolder; shared networks use an authorized ordinary Drive file. Tokens remain in memory. Reconnect with the same account to recover pending writes.
- **Server:** private `DATA_DIR/<identity hash>/GraphLiveFiles`, atomic file replacement, exclusive write lock and revision checks. This is a single-instance local-disk design.

A durable local outbox queues edits while remote writes run in the background. “Saved on this device” does not mean the cloud write finished. Keep an independent export if recovery or authorization is blocked.

Drive automatic backups are limited to one per 15 minutes when saving and retain the latest 20. New manual backups are not automatically deleted. Legacy cleanup requires confirmation and keeps the latest 20 legacy copies. Browser backups retain 10; server retention uses `BACKUP_KEEP` (default 10). Cleanup runs while the application is used.

JSON exports contain the snapshot. ZIP exports contain the current network under `GraphLiveFiles/`, including embedded images, not backup history or secrets. Dashboard import creates a new network; restoring within an open network previews and replaces it after backup. Snapshots and ZIP expansion are validated and size-limited.

Server snapshots are the commit point; identity/index files are projections. Do not edit projections as a substitute for importing a valid snapshot. For a stale server lock, stop every writer, copy the directory and verify no process still uses it before removing the lock. Never initialize over an incomplete existing network.
