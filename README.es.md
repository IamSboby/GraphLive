# GraphLive — 1.1.1

[English](README.md) · Español

**Made by [Sboby](https://github.com/IamSboby).** [Abrir GraphLive](https://iamsboby.github.io/GraphLive/) · [Proyecto GitHub](https://github.com/IamSboby/GraphLive)

Un espacio visual para personas y relaciones. Crea redes independientes de tu vida, ficción o videojuegos, con identidad, tema y banner propios. El inglés es predeterminado; español, italiano, alemán, francés y portugués están disponibles. Se respeta el idioma guardado.

## Funciones

- Dashboard con redes, renombrado, importación JSON/ZIP, caché y actualización en segundo plano.
- Personas con foto recortada, cámara compatible, nacionalidades, etiquetas, intereses y enlaces sociales.
- Relaciones con percepción por extremo, frecuencia e intensidad. Conexiones por grupos sin sobrescribir vínculos existentes.
- Grafo y lista, búsqueda por nombre/etiqueta/interés, zoom táctil, deshacer/rehacer y distribución por afinidad de etiquetas. Las posiciones se conservan al reabrir.
- Colores de relaciones y temas claro/oscuro personalizados, ocultación de fotos o años y exportación de apariencia. Perfil principal con degradado propio.
- Almacenamiento en navegador, carpeta autorizada, Google Drive o servidor Node privado opcional.
- Redes Drive compartidas con lectura/edición y revocación individual. El guardado en segundo plano permite seguir editando.

## Inicio y pruebas

Node.js 22.13+ en rama 22, o 24+, y npm:

```sh
npm ci
npm run dev
```

Abre http://localhost:3000. La demo ficticia vive en memoria. El servidor tiene autenticación desactivada por defecto: mantenlo local o configura protección antes de exponerlo. No subas entorno ni datos privados a Git.

Rutas: / inicio, /login/ almacenamiento, /dashboard/ redes e importación, /graph/ editor, /privacy/ y /terms/ políticas. El logotipo vuelve al inicio y cada red tiene identidad independiente. Se respeta el movimiento reducido.

```sh
npm run check
npm run build
npm run test:e2e
npm run build:pages
npx playwright test --config playwright.pages.config.ts
```

Las pruebas locales usan Edge; CI instala Chromium. Las PR prueban ambas ediciones sin desplegar. Dependabot revisa npm y GitHub Actions semanalmente; las actualizaciones incompatibles no se fusionan.

## Datos y límites

Los cambios se conservan primero en una cola local. «Guardado localmente» no confirma sincronización cloud. Las redes compartidas se consultan mientras están visibles; los conflictos requieren decisión.

Drive conserva 20 copias automáticas, como máximo una cada 15 minutos al guardar. Las manuales nuevas requieren eliminación explícita. Borrar datos del navegador puede perder cambios pendientes; exporta copias independientes.

Drive accede a datos de aplicación y archivos compartidos autorizados, no a todo el disco. Los destinatarios ven toda la red, incluidas notas. Revocar no elimina descargas anteriores. OneDrive y SbobyPiShare siguen no disponibles.

No hay cifrado de extremo a extremo del JSON activo o exportado. El ZIP incluye la red e imágenes, no el historial de backups. El servidor opcional está diseñado para una instancia con disco local privado.

## Documentación

- [Arquitectura](docs/architecture.es.md)
- [Modelo](docs/data-model.es.md)
- [Almacenamiento](docs/storage.es.md)
- [Sincronización](docs/synchronization.es.md)
- [Seguridad](docs/security.es.md)
- [Despliegue](docs/deployment.es.md)
- [Pages y Drive](docs/github-pages.es.md)
- [SbobyPiShare](docs/sbobypishare-integration.es.md)
- [Contribución](docs/contributing.es.md)
- [Mapa del repositorio](docs/repository-tree.es.md)
- [Cambios](CHANGELOG.es.md) · [Avisos de terceros](THIRD_PARTY_NOTICES.es.md)

![Red ficticia](docs/screenshots/network.png)

Licencia MIT. Dependencias fijadas en package-lock.json. Contacto: Iamsboby@gmail.com.
