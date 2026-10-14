# Installation and deployment

English · [Español](deployment.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

Use Node.js 22.13+ on the 22 line, or 24+, and npm. Install with `npm ci`, then `npm run dev` and open http://localhost:3000. If PowerShell blocks npm scripts, use `npm.cmd`.

For production Node: run `npm run check`, `npm run build`, then `npm run start`. Do not run development and production builds in the same .next directory simultaneously. Use an HTTPS reverse proxy and persistent private storage. Dockerfile and Compose are provided; validate them with your own Docker daemon.

| Variable                                                              | Purpose                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| AUTH_ENABLED                                                          | Enable server authentication; false by default                |
| NEXTAUTH_URL                                                          | Exact public server origin and OAuth callback base            |
| NEXTAUTH_SECRET                                                       | Required server session secret when authentication is enabled |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET                               | Server Google login                                           |
| AZURE_AD_CLIENT_ID / AZURE_AD_CLIENT_SECRET / AZURE_AD_TENANT_ID      | Server Microsoft login                                        |
| DATA_DIR                                                              | Private persistent storage; default ./data                    |
| MAX_SNAPSHOT_BYTES                                                    | Server snapshot limit; default 10485760                       |
| BACKUP_KEEP                                                           | Server backup retention; default 10                           |
| BACKUP_ENCRYPTION_KEY                                                 | Optional 64-hex AES-256-GCM backup key                        |
| SERVER_STORAGE_ENABLED / LOCAL_FOLDER_ENABLED / CUSTOM_FIELDS_ENABLED | Server-provided feature controls                              |
| NEXT_TELEMETRY_DISABLED                                               | Set to 1 to disable Next telemetry                            |
| PAGES_BASE_PATH                                                       | Static build prefix; default /GraphLive                       |
| PLAYWRIGHT_CHANNEL                                                    | msedge locally; chromium in CI                                |

Store secrets locally or in deployment environment variables, never Git. Google server callback is `/api/auth/callback/google`; Microsoft is `/api/auth/callback/azure-ad`. These server credentials do not configure browser Drive storage.

Static hosting uses `npm run build:pages`; publish only `pages-dist/`. See [GitHub Pages](github-pages.md). Other origins require their own Google OAuth origins and Picker restrictions. OneDrive storage and SbobyPiShare remain unavailable.

For browser tests, build the relevant edition first. Run `npm run test:e2e` for Node or `npx playwright test --config playwright.pages.config.ts` for static Pages. Install Chromium with Playwright when selecting that channel. Never point these tests at personal data.
