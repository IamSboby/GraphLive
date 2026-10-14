# Repository map

English · [Español](repository-tree.es.md)

GraphLive 1.1.1 · 14 October 2026. This is a directory-level map, not an exhaustive generated file list.

```text
GraphLive/
├── .github/              # CI, Pages deployment and Dependabot
├── app/                  # home, login, dashboard, graph, policies and Node API
├── packages/
│   ├── appearance/       # themes and relationship colors
│   ├── auth/             # optional server authentication
│   ├── config/           # effective feature configuration
│   ├── domain/           # schemas, operations, images, social profiles, demo
│   ├── graph-engine/     # metrics and worker layout
│   ├── i18n/             # English, Spanish, Italian, German, French, Portuguese
│   ├── security/         # server protections
│   ├── storage-adapters/ # browser, folder, server, Drive, experimental transport
│   ├── storage-core/     # repositories, exports, backups and outbox
│   ├── sync-engine/      # merging and conflicts
│   └── ui/               # dashboard, graph, forms, cropping and sharing
├── public/               # local flags, icons, sitemap and public resources
├── tests/                # unit/integration, Node E2E and Pages E2E
├── scripts/              # build, packaging, static preview and benchmarks
├── docs/                 # English primary and .es.md translations
├── releases/             # versioned release notes
├── README.md             # primary English guide
├── README.es.md          # Spanish guide
├── CHANGELOG.md
└── package.json / package-lock.json
```

Generated dependencies/builds, private data, environment files and local notes are excluded from Git. Use `git ls-files` for the complete tracked inventory.
