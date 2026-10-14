# GitHub Pages

English · [Español](github-pages.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

Live site: https://iamsboby.github.io/GraphLive/. Repository: https://github.com/IamSboby/GraphLive. Repository visibility and website visibility are independent; a link does not grant access to a private repository.

The Pages workflow builds static routes under /GraphLive, runs type/lint/unit and browser checks, then deploys main. Pull requests run the static checks but cannot deploy or publish releases. Only pages-dist is uploaded; API routes, environment files and personal networks are excluded.

The landing page defaults to English, links to the project and credits “Made by Sboby”. Saved language selections override the default. /login/ selects storage; /dashboard/ lists and imports networks; /graph/ edits the selected network. /privacy/ and /terms/ publish the legal information.

Browser storage uses IndexedDB. Local folders require File System Access support and user permission. Google Drive works directly from the browser, with appdata for private networks and file access for shared files. The shared-network picker/list can only show files authorized for the application; it cannot silently scan every file in an account.

OAuth availability depends on the configured Google application audience, publishing status and verification. A test-only 403 is a Google configuration restriction, not a storage failure. Register allowed origins for custom deployments; never put a client secret in a static build.

A Pages deployment is successful only after the deploy job succeeds. Canceled older runs may simply have been superseded by a newer main commit. Historical red workflow entries describe those older commits, not necessarily current code.
