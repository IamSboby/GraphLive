# GitHub Pages

[English](github-pages.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

Web: https://iamsboby.github.io/GraphLive/. Repositorio: https://github.com/IamSboby/GraphLive. La visibilidad del repositorio y la web es independiente; un enlace no concede acceso a un repositorio privado.

El workflow compila rutas estáticas bajo /GraphLive, ejecuta tipos, lint, pruebas unitarias y de navegador y publica main. Las PR prueban la edición estática, sin desplegar ni publicar releases. Solo se sube pages-dist; quedan fuera API, entorno y redes personales.

La portada usa inglés por defecto, enlaza el proyecto y acredita «Made by Sboby». Se respeta el idioma guardado. /login/ selecciona almacenamiento; /dashboard/ lista e importa redes; /graph/ edita la seleccionada. /privacy/ y /terms/ muestran la información legal.

El navegador usa IndexedDB. Las carpetas requieren File System Access y permiso. Drive funciona directamente desde el navegador: appdata para redes privadas y acceso a archivos para compartir. El selector/listado compartido solo ve archivos autorizados para la aplicación, no todo Drive automáticamente.

La disponibilidad OAuth depende del público, publicación y verificación en Google. Un 403 por aplicación en pruebas es una restricción de configuración. Registra los orígenes de otros despliegues; nunca incluyas secretos de cliente en el build estático.

El despliegue termina cuando deploy pasa. Ejecuciones antiguas canceladas pueden haber sido reemplazadas por otro commit. Las entradas rojas históricas describen aquellos commits, no necesariamente el código actual.
