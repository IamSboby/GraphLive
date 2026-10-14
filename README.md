# GraphLive — 1.1.1

English · [Español](README.es.md)

**Made by [Sboby](https://github.com/IamSboby).** [Open GraphLive](https://iamsboby.github.io/GraphLive/) · [GitHub project](https://github.com/IamSboby/GraphLive)

A visual workspace for people and relationships. Create independent networks for real life, fiction or games, each with its own identity, theme and banner. English is the default; Spanish, Italian, German, French and Portuguese are available. Saved language choices are respected.

## What you can do

- Manage, rename and import JSON/ZIP networks from a dashboard with cached previews and background refresh.
- Add people with cropped portraits, nationalities, tags, interests and social links. Use the camera where supported.
- Build relationships with separate endpoint perceptions, frequency and intensity. Add tag groups without overwriting existing connections.
- Explore the graph or list, search names/tags/interests, pan and pinch to zoom, undo/redo and rearrange by tag affinity. Saved positions survive reopening.
- Customize relationship colors and light/dark themes, hide portraits or years and export appearance files. The owner has a distinct gradient.
- Store networks in this browser, a permitted local folder, Google Drive or an optional private Node server.
- Share authorized Drive networks with read/edit access and revoke individual permissions. Editing and background saves do not lock the interface.

## Run locally

Use Node.js 22.13+ on the 22 release line, or 24+, and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The fictional demo stays in memory. Server authentication is disabled by default: keep it on localhost or configure access control before exposing it. Keep environment files and private data out of Git.

## Routes

| Route                 | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| /                     | Introduction, demo, GitHub links and author credit     |
| /login/               | Storage selection and authorization                    |
| /dashboard/           | Independent networks, import and shared-network access |
| /graph/               | Graph/list editor                                      |
| /privacy/ and /terms/ | Public policies and contact                            |

Clicking the GraphLive brand returns home. Each network has an independent owner profile. Motion preferences are respected.

## Checks and deployment

```sh
npm run check
npm run build
npm run test:e2e
npm run build:pages
npx playwright test --config playwright.pages.config.ts
```

Local browser tests use Edge by default; CI installs Chromium. Pages publishes only after its checks pass. Pull requests test both editions without deploying. Dependabot reviews npm and GitHub Actions weekly; incompatible updates are not merged.

## Data and limits

Background writes first preserve pending edits locally. “Saved locally” is not confirmation of cloud synchronization. Shared networks poll while visible; collaboration is not instantaneous. Conflicting edits require a decision.

Drive keeps up to 20 automatic backups, at most one per 15 minutes when saving. New manual copies are retained until explicitly removed. Browser copies and exports are device-local; clearing site data can remove unsynchronized changes. Export independent backups.

Drive permissions cover application data and explicitly authorized shared files, not unrestricted access to every file. Recipients can access the whole shared network, including notes. Revocation cannot erase downloaded copies. OneDrive and SbobyPiShare storage remain unavailable.

Active JSON and exported data are not end-to-end encrypted. ZIP exports include the current network and embedded pictures, not backup history. The optional Node backend is designed for a single instance with private local disk.

## Documentation

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [Storage and backups](docs/storage.md)
- [Synchronization](docs/synchronization.md)
- [Security and privacy](docs/security.md)
- [Installation and deployment](docs/deployment.md)
- [GitHub Pages and Drive](docs/github-pages.md)
- [SbobyPiShare status](docs/sbobypishare-integration.md)
- [Contributing](docs/contributing.md)
- [Repository map](docs/repository-tree.md)
- [Changelog](CHANGELOG.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

![GraphLive fictional network](docs/screenshots/network.png)

MIT license. Dependency versions are pinned in package-lock.json. Support: Iamsboby@gmail.com.
