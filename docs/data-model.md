# Data model

English · [Español](data-model.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

The application version is 1.1.1; the snapshot schema remains `schemaVersion: 1`. The authoritative definitions are `packages/domain/model.ts`, `images.ts`, `social.ts` and `packages/appearance/config.ts`. Unknown schema versions and invalid references are rejected.

A snapshot contains revision, ownerId, deviceId, people, connections, counters, tombstones and preferences. Each network has its own owner identity, name, banner, appearance and layout.

People have immutable UUIDs and storage IDs (M/F/L/U plus a counter), profile data, display positions and custom fields. Changing gender does not rename existing files. Profiles support tags, interests, dates, nationalities, notes, a cropped JPEG portrait and up to 20 social profiles. Embedded portrait and banner limits are 120,000 and 300,000 characters respectively; these travel with exports.

Connections use a canonical key formed by sorting the two UUIDs and joining them with `::`. Self-links, duplicate pairs and missing endpoints are rejected. Relationships include best friend, close friends, partner, crush and married; the complete enum comes from `relationship-colors.json`.

Both endpoint perspectives are concrete relationship types. Legacy empty/unspecified perspectives normalize to the general type. Automatic-perspective flags keep a side following that type until explicitly customized. Adding a tag group preserves existing connections.

Deletions record tombstones. Undo/redo and restore are explicit operations; counters never move backwards. Dates remain ISO in storage and are formatted by language only for display. Preference defaults use English and the system theme; explicit older preferences remain intact.
