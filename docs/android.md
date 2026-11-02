# Android offline build and verification

GraphLive Android reuses the React UI, Snapshot format, `OfflineNetworks`, three-way merge and Google Drive adapter. Capacitor supplies the shell; the native GraphLive plugin supplies durable SQLite storage and Google authorization. WorkManager runs the same bundled TypeScript sync engine inside AndroidX JavaScriptSandbox. Unsupported engines fall back to foreground sync. Android controls when background work is allowed; a scheduled job is not a guaranteed immediate upload.

## Storage and permissions

SQLite stores base, local and conflict snapshots plus a versioned editor journal. Compare-and-set prevents an old acknowledgment from clearing newer edits. Large JSON bodies use SQLiteStatement rather than CursorWindow. Tokens are obtained through Google Play services and are not written to the database. The saved account binding is verified before Drive requests. Local changes survive authorization errors. Removing a downloaded network is refused while pending changes or conflicts remain.

## Windows build on the NAS

All SDK, JDK, Gradle data, build output and Android user files belong under the selected NAS root. Map the share to a free drive letter when building with Webpack; UNC module resolution fails in this environment. The mapping does not relocate data to the PC.

1. Copy reviewed application sources, scripts, `android-native`, configuration and package manifests into the NAS project. Exclude `.git`, `.env`, agent notes and secrets.
2. Install the lockfile dependencies in the NAS project using a NAS npm cache. Keep `GRAPHLIVE_NODE_MODULES` on the same mapped NAS drive as the build root; Next/Webpack produces invalid entry paths when these are on different Windows drives.
3. Export with `GRAPHLIVE_BUILD_ROOT` pointing at the mapped NAS project, `GRAPHLIVE_ANDROID=true`, and `PAGES_BASE_PATH` empty. Run the reviewed `scripts/build-pages.mjs` from the local source checkout; all generated output goes to the configured NAS project.
4. Run the local `scripts/build-android.ps1 -NasRoot <mapped NAS root> -ProjectPath <NAS project> -SkipWeb`. It syncs Capacitor, installs the native sources, bundles the shared worker and assembles the debug APK. The generated `android` folder is ignored by Git.
5. Preserve the debug signing key on the NAS. Register package `com.graphlive.android` and its actual signing SHA-1 as an Android OAuth client in the same Google project as the web application. A web OAuth client alone is insufficient. Never commit a keystore or credential file.

## Verification status

The six focused Vitest suites contain 53 passing simulated tests as of 2026-10-20. The isolated worker test does not execute AndroidX or Google Play services. Native tests are supplied in `android-native/tests` for database close/reopen, a payload above 3 MB, stale CAS and journal acknowledgments, and startup of the packaged JavaScript engine. They require an Android device and have not yet been executed.

Still required before claiming the application verified: a successful native APK build, installation, OAuth validation, full offline airplane-mode editing and cold restart, reconnection checked from the web, concurrent web/mobile changes and conflict resolution, interrupted upload without duplication, expired/revoked access, and low-storage handling. Use a disposable test network; do not clear real user app data. Record automated checks separately from real-device and real-Drive results in the project memory.


The static export and Capacitor sync completed on the NAS. Native compilation is **not verified**: this Windows SMB environment produced native JDK library-loading errors and Gradle cache-stat failures. UNC-only Gradle startup also failed with `URI has an authority component`. The attempted path/workaround settings do not establish a working native build. An alternative build environment (execution on the NAS host or CI) must be selected before APK installation and device tests can proceed. No APK has been installed.

## Compilación remota de desarrollo
El workflow Android debug APK compila en Ubuntu con Node 24 y JDK 21. Se activa al enviar la rama android/offline-drive. Genera APK de aplicación y de pruebas instrumentadas, SHA256 y certificado público; no publica claves de firma, .env ni notas locales. Los artefactos caducan a los 14 días. La firma debug generada por el runner es temporal: antes de registrar OAuth definitivo se debe estabilizar la clave de desarrollo con almacenamiento privado. Compilar las pruebas no significa ejecutarlas en un teléfono.

## Firma persistente y continuidad con la web
Las compilaciones remotas generan artefactos de desarrollo; antes de instalarlos se firman con scripts/sign-android.ps1 usando la clave privada persistente del NAS. La contraseña se protege con DPAPI del usuario Windows. No se suben clave, contraseña ni archivos DPAPI a GitHub. Conservar esta clave y el acceso al perfil Windows: regenerarla cambia la identidad de instalación. El script exige que entrada y salida permanezcan dentro del NAS y verifica ambas firmas.

La web conserva su workflow Pages: check, exportación y pruebas de navegador antes de desplegar main. Android se comprueba en PR y se compila desde main y la rama de desarrollo, con npm run check antes del APK. Esto automatiza la construcción validada; todavía no equivale a distribución automática ni instalación silenciosa de la app. La firma local y publicación del APK estable siguen siendo pasos necesarios. No fusionar el borrador Android hasta completar OAuth y pruebas reales de Drive.
