# Instalación y despliegue

[English](deployment.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

Usa Node.js 22.13+ en la rama 22, o 24+, y npm. Ejecuta `npm ci`, `npm run dev` y abre http://localhost:3000. Si PowerShell bloquea npm, utiliza `npm.cmd`.

En producción Node: `npm run check`, `npm run build` y `npm run start`. No ejecutes desarrollo y compilación sobre la misma carpeta .next simultáneamente. Configura proxy HTTPS y almacenamiento privado persistente. Dockerfile y Compose están incluidos; valídalos con tu daemon.

Variables principales: `AUTH_ENABLED` activa autenticación; `NEXTAUTH_URL` define el origen exacto; `NEXTAUTH_SECRET` protege sesiones; `GOOGLE_CLIENT_ID/SECRET` y `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID` configuran login servidor. `DATA_DIR` usa ./data por defecto; `MAX_SNAPSHOT_BYTES`, 10485760; `BACKUP_KEEP`, 10. `BACKUP_ENCRYPTION_KEY` admite una clave AES-256-GCM de 64 hex.

`SERVER_STORAGE_ENABLED`, `LOCAL_FOLDER_ENABLED` y `CUSTOM_FIELDS_ENABLED` controlan funciones. `NEXT_TELEMETRY_DISABLED=1` desactiva telemetría de Next. `PAGES_BASE_PATH` usa /GraphLive y `PLAYWRIGHT_CHANNEL` usa msedge localmente o chromium en CI.

Guarda secretos en el entorno, nunca en Git. Callbacks: `/api/auth/callback/google` y `/api/auth/callback/azure-ad`. Las credenciales del login servidor no configuran el almacenamiento Drive del navegador.

Para hosting estático ejecuta `npm run build:pages` y publica solo `pages-dist/`. Consulta [GitHub Pages](github-pages.es.md). Otros orígenes necesitan configuración propia de OAuth y Picker. OneDrive y SbobyPiShare siguen no disponibles.

Compila antes de probar: `npm run test:e2e` para Node o `npx playwright test --config playwright.pages.config.ts` para Pages. Instala Chromium con Playwright si eliges ese canal. No ejecutes pruebas sobre datos personales.
