# GitHub Pages

La edición estática se publica desde el repositorio privado mediante `.github/workflows/pages.yml`. En Settings → Pages, seleccionar GitHub Actions. El repositorio permanece privado, pero el sitio es público. No se publican redes personales, archivos `.env`, API ni datos del servidor.

URL del proyecto: https://iamsboby.github.io/GraphLive/

## Almacenamiento

- **En este navegador**: IndexedDB, con guardado automático, detección de conflictos entre pestañas y las diez copias más recientes. Los datos pertenecen al origen web y al perfil del navegador; no se comparten con localhost, otros dispositivos ni otros navegadores. Borrar los datos del sitio elimina la red y sus copias. Exportar JSON/ZIP para conservar una copia independiente.
- **Carpeta de este dispositivo**: requiere un navegador compatible con File System Access y permiso para la carpeta. Si el navegador integrado impide el selector, usar «En este navegador» o abrir el sitio en Edge/Chrome.
- Sin servidor privado ni login de servidor en esta edición. La ruta `/login/` permite elegir almacenamiento local o autorizar Google Drive.

## Construcción y verificación

`npm run build:pages` crea una copia temporal controlada en `.pages-build/`, elimina de esa copia las rutas API y usa páginas estáticas. El proyecto Next.js original conserva su modo servidor. La salida publicable es exclusivamente `pages-dist/`; nunca publicar la raíz del proyecto.

`PAGES_BASE_PATH` permite ajustar `/GraphLive` al nombre de otro repositorio (vacío para dominio raíz). Las rutas, recursos y SVG usan ese prefijo.

Ejecutar `npx playwright test --config playwright.pages.config.ts` después de compilar. Verifica creación, conexión opcional, persistencia tras recarga, banderas, Worker, exportación y ausencia de peticiones API. El workflow solo publica si pasan las comprobaciones.

## Google Drive

Selecciona Google Drive en Acceder y autoriza tu cuenta. El cliente público está registrado para https://iamsboby.github.io; otros dominios necesitan su propio registro OAuth. La aplicación solicita únicamente drive.appdata y guarda un snapshot JSON en el espacio privado de GraphLive, que no aparece en Mi unidad. No utiliza secretos de cliente ni un servidor. Los tokens permanecen en memoria; al caducar, Reconectar Google Drive conserva los cambios pendientes y exige la misma cuenta.

La aplicación OAuth está en pruebas: solo las cuentas añadidas en Google Cloud pueden conectarse. Las copias automáticas y manuales se conservan en Drive y consumen espacio. Se pueden previsualizar y restaurar desde Ajustes. Crea la primera red desde un solo dispositivo: las inicializaciones simultáneas se detectan y bloquean sin eliminar ninguna red. Las actualizaciones usan revisión y ETag para detectar conflictos.
