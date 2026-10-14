# Contribución

[English](contributing.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

Empieza por arquitectura, modelo y almacenamiento. Instala con npm ci. Ejecuta npm run check y compila/prueba en navegador tanto Node como Pages al cambiar interfaz compartida o persistencia.

El dominio no debe depender de React ni del sistema de archivos. No importes adaptadores servidor en componentes cliente. Los proveedores nuevos deben cumplir garantías de repositorio y permanecer deshabilitados hasta validarse.

La documentación principal está en inglés; actualiza su .es.md correspondiente. Añade textos a los seis idiomas y conserva interpolaciones. No traduzcas identificadores persistentes ni datos del usuario.

Las pruebas existentes en español lo seleccionan mediante tests/spanish-fixture.ts. Las de visitantes nuevos verifican el inglés real. No elimines aserciones ni ocultes fallos para aceptar dependencias.

Dependabot revisa npm y GitHub Actions semanalmente. Next y ESLint se actualizan juntos. TypeScript 7 se pospone mientras el analizador lo rechace; los tipos Node deben corresponder al runtime mínimo. Revisa código, lockfile y ambos workflows antes de fusionar.

No subas credenciales, .env, redes personales, builds ni notas locales de instrucciones. Prueba invariantes relevantes: autorización, conflictos, importación y persistencia. Las migraciones deben ser explícitas y validar antes de escribir.
