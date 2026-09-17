# Desarrollo y ampliación

1. Leer arquitectura, modelo y seguridad.
2. Instalar con `npm ci`; no editar el lockfile manualmente.
3. Ejecutar `npm run check`, `npm run build` y `npm run test:e2e`.
4. Añadir pruebas de invariantes cuando cambien identidad, canonicalización, sincronización o autorización.
5. Añadir cada texto visible a ES y EN. No traducir identificadores persistentes.
6. No introducir secretos, datos reales ni snapshots personales en fixtures, logs o capturas.

Los módulos de dominio no pueden importar React ni APIs del sistema de archivos. Los adaptadores backend nunca se importan en componentes cliente. Nuevos proveedores implementan `Repository` o `StorageAdapter`, declaran sus garantías y permanecen deshabilitados hasta probarse contra un servicio real.

Para una migración futura: validar versión antigua, generar backup, transformar, validar versión nueva y solo entonces escribir mediante el repositorio. Nunca migrar por inferencia si falta `schemaVersion`.

Métricas nuevas deben documentar su significado y coste. Computaciones de layout deben seguir en un Worker. No incorporar inferencia social ni analítica remota sin una decisión explícita del producto y consentimiento.

El CI incluido ejecuta comprobaciones y E2E en Linux. Su definición está versionada, pero su ejecución en GitHub solo ocurre tras subir el repositorio.
