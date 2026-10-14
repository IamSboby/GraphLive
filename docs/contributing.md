# Contributing

English · [Español](contributing.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

Start with the architecture, data model and storage documents. Install the pinned dependencies with npm ci. Run npm run check, then build and browser-test both Node and Pages editions when changing shared UI or persistence.

Keep domain logic independent of React and filesystem APIs. Never import server adapters into client components. New storage providers must implement repository guarantees and remain unavailable until integration is validated.

English is the primary documentation language. Keep the corresponding .es.md version current. Add UI strings to all six languages and preserve interpolation keys. Do not translate persisted identifiers or user-entered text.

Existing Spanish browser scenarios explicitly select Spanish through tests/spanish-fixture.ts. New visitor tests exercise the actual English default. Do not remove assertions or hide failing tests to approve dependency updates.

Dependabot checks npm and GitHub Actions weekly. Next and its ESLint configuration update together. TypeScript 7 is deferred while the lint parser rejects it; Node type definitions must match the oldest supported runtime. Review code, lockfile and both CI workflows before merging.

Do not commit credentials, .env files, personal networks, generated builds or local instruction notes. Regression tests should cover meaningful invariants such as authorization, conflict handling, import validation and persistence. Keep schema migrations explicit and validate before writing.
