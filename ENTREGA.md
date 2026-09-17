# Entrega de GraphLive 0.1

Se entrega un núcleo funcional de GraphLive, con código fuente, persistencia real, pruebas y documentación. **No se declara terminado todo el alcance del prompt maestro.** Las integraciones sin credenciales o garantías suficientes permanecen deshabilitadas y los pendientes están enumerados.

1. **Arquitectura.** Next.js App Router sobre Node.js; React/Radix; TypeScript estricto; Zod; Zustand; i18next; Cytoscape Canvas; ForceAtlas2 en Worker. Dominio, visualización, sincronización, autenticación y adaptadores separados. [Detalle](docs/architecture.md).
2. **Árbol completo.** [Todos los archivos de la entrega](docs/repository-tree.md). Se omiten dependencias y archivos generados del árbol documental.
3. **Funciones implementadas.** Personas, UUID y contadores M/F/L/U; conexiones únicas con perspectivas; formularios; grafo interactivo; búsqueda, filtros y rutas; estadísticas; ES/EN y temas; demo aislada; servidor JSON; adaptador de carpeta local; revisiones, conflictos y tombstones; importación/exportación y backups. [Matriz completa](docs/status.md).
4. **Pendientes.** Login real con cuentas del propietario, proveedores cloud y transporte SbobyPiShare, endpoints personalizados, avatares, aristas por arrastre, comunidades Louvain, mejoras de conflictos/offline y auditorías completas. Docker/CI se incluyen sin afirmar su ejecución. [Estado exacto](docs/status.md).
5. **Instalación.** Node 22.13+ (rama 22) o 24+, `npm ci`, copiar `.env.example` a `.env.local`. En npm 12.0.2, consultar la salvedad de tarballs en [despliegue](docs/deployment.md).
6. **Configuración.** Por defecto acceso local sin OAuth. Elegir servidor o carpeta y crear propietario. Configurar `DATA_DIR` fuera de carpetas públicas. Para exposición por red, habilitar autenticación y HTTPS.
7. **Variables.** [Tabla y ejemplos](docs/deployment.md#variables) y `.env.example`. No se incluyen secretos reales.
8. **Desarrollo.** `npm run dev`; abrir `http://localhost:3000`. La demo no se guarda ni mezcla con la red real.
9. **Pruebas.** `npm run check`; después `npm run build` y `npm run test:e2e`. `npm run benchmark` mide validación, métricas y layout con 500/1.000 nodos.
10. **Producción.** `npm run build` y `npm run start`. Alternativa Docker: `docker compose up --build -d`. Reverse proxy HTTPS y disco privado persistente para el despliegue real.
11. **Resultados.** [Informe de verificación](docs/verification.md): instalación limpia, tipos, lint, pruebas, build, auditoría de dependencias, benchmark y revisión visual. Incluye incidencias y lo que no se pudo verificar.
12. **Límites.** Snapshot completo, una instancia de servidor con disco local, carpeta local sin sincronización multidispositivo, estadísticas descriptivas, ZIP de red activa sin historial. No se prometen FPS ni cumplimiento WCAG certificado.
13. **Decisiones.** UUID separado del archivo; arista canónica única; snapshot como commit atómico y archivos individuales como proyecciones; fusión de tres versiones; núcleo estable antes de cloud; datos demo solo en memoria.
14. **Seguridad.** JSON activo sin cifrar: proteger disco y ACL. Backups pueden cifrarse con AES-GCM. Modo sin auth es compartido. Copias locales no protegen de fallo del disco. [Modelo y riesgos](docs/security.md).
15. **Próximos pasos.** Validación OAuth con dos usuarios; pruebas físicas de carpeta y accesibilidad; CAS en SbobyPiShare; luego Drive/OneDrive, perfiles con imágenes y comunidades avanzadas.

## Reproducción del paquete

`npm run package:source` genera `../GraphLive.zip` y su SHA-256, excluyendo datos, secretos, dependencias, compilación y metadatos Git. El repositorio local está inicializado; no se ha publicado, subido a GitHub ni creado un commit con una identidad inventada.
