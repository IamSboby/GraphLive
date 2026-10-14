# Synchronization and recovery

English · [Español](synchronization.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

Edits update local state immediately and enter the durable IndexedDB outbox. A serialized background save loop coalesces subsequent edits instead of blocking theme changes or further editing. Pending writes are scoped to storage/account/network so they cannot silently move to another account.

Writes carry the expected revision; Drive also uses conditional file updates. On conflict, the client compares base, local and remote snapshots. Independent changes merge automatically; conflicting fields require an explicit decision. Export the pending version before discarding it. Arrays are treated as complete values rather than blindly unioned.

While visible and online, shared networks refresh approximately every 3 seconds and other repositories every 15 seconds; failures back off. Returning to the tab or reconnecting also requests refresh. This is polling, not real-time sockets or a guarantee of instantaneous delivery.

Sharing flushes pending changes before inviting participants. Read/edit permissions and participant revocation are managed through Drive. Revocation prevents future authorized access but cannot erase downloaded copies. Lost access preserves local pending changes for recovery.

Saved node positions remain stable when reopening. Dashboard summaries are a cache, not the authoritative snapshot; background refresh reconciles them with the repository. Do not clear site data while unsynchronized changes are needed.
