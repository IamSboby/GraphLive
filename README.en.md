# GraphLive — 0.1.0-alpha.1

Serverless web edition: [GraphLive on GitHub Pages](https://iamsboby.github.io/GraphLive/). Store your network in this browser or a local folder. Browser data stays on this device; export JSON to keep an independent copy. Clearing site data removes the network and its local backups.

[Español](README.md) · English

A private, self-hosted relationship graph. Explore people and connections on an interactive canvas, keep records in JSON files, and choose Spanish or English and light or dark mode.


## Run locally

Use Node.js 22.13+ on the 22 release line, or Node.js 24+.

```sh
npm ci
touch .env.local
npm run dev
```

On Windows, use `New-Item .env.local -ItemType File`. Open http://localhost:3000 and choose storage, or explore the fictional demo. The demo does not save personal data.

Select **EN** in the language menu on the welcome screen or in the network toolbar. Gender is a dropdown with optional and inclusive choices. New filenames automatically use M for men, F for women, L for other identities, and U for unspecified or undisclosed gender. Existing filenames and UUIDs remain stable when editing. Legacy custom gender text is preserved.

Nationality flags are locally served SVG icons, including in the graph and PNG export. They do not depend on emoji fonts or external image services.

Authentication is disabled in the example configuration. Keep that configuration on localhost; configure OAuth or external access control before exposing the instance. Never put the data directory inside `public/`.

## Pages

`/` is the home page, `/login` handles access and storage selection, and `/graph` is the graph editor. Clicking the GraphLive brand returns home while preserving the open network during internal navigation. A full reload requires reopening saved data; the fictional demo remains memory-only. Animations respect reduced-motion preferences.

## Validation and deployment

```sh
npm run check
npm run build
npm run start
```

`npm run test:e2e` runs browser scenarios against a separate test server on port 3100. Microsoft Edge is the default browser; CI uses Playwright Chromium. `docker compose up --build -d` uses the provided Docker configuration, which still requires validation with a Docker daemon.

See [deployment](docs/deployment.md), [security](docs/security.md), [architecture](docs/architecture.md), and [alpha changes](CHANGELOG.md). Most detailed technical documentation is currently in Spanish.

## Third-party assets

Country flags come from the pinned `flag-icons` package, under the MIT license. The vendored SVGs and license are in `public/flags/`. See [third-party notices](THIRD_PARTY_NOTICES.md).
