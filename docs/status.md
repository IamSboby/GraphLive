# Estado de la entrega

Este documento distingue el núcleo implementado de las capacidades que todavía necesitan trabajo. No es una afirmación de cumplimiento completo de los 35 apartados del prompt maestro.

## Implementado

- Proyecto Next.js/React con TypeScript estricto, Radix Dialog, Tailwind/CSS, Zod, Zustand e i18next. Versiones fijadas y lockfile.
- Personas con datos opcionales, nombre alternativo, selector de género y clasificación automática de archivo inicial M/F/L/U, UUID, intereses y etiquetas sin duplicados, múltiples países y campos personalizados.
- Relaciones canónicas únicas, atributos de intensidad/frecuencia/importancia, estado, fechas, notas y perspectivas. Fichas de ambos extremos consultan la misma entidad.
- Lienzo Canvas con ForceAtlas2 en Worker, zoom/pan, selección, posiciones arrastradas persistidas, fijación, recentrado, reinicio, parada, rutas y captura PNG.
- Tamaño logarítmico y cuatro modos de métrica; colores solicitados; intensidad y frecuencia en aristas; línea discontinua por estado. Etiquetas por nombre, año y banderas.
- Estadísticas de grado, afinidad, intensidad, componentes conexos y puentes; tooltip y ficha. Lista/tabla alternativa.
- Búsqueda normalizada y opt-in para notas; filtros combinables; historial para deshacer/rehacer.
- Onboarding con detección de red existente, demo de 28 personas en memoria separada, idiomas ES/EN, temas y controles móviles.
- Repositorio servidor aislado, API validada, control de origen, rate limit, permisos de archivo, snapshot atómico, revisiones, backups, tombstones y fusión de campos independientes.
- Adaptador File System Access API con permisos, revisión, Web Locks, apertura existente y errores recuperables. Pruebas mediante handles de prueba; no se automatizó un selector nativo de una carpeta física del usuario.
- Importación validada JSON/ZIP, resumen previo y restauración con backup; exportación de red actual JSON/ZIP; copias automáticas antes del guardado y manuales.
- CSP con nonce, logs sin datos privados, diagnóstico y cifrado opcional de backups servidor.
- Auth.js Google/Microsoft configurable, verificación de sesión en rutas servidor y cierre de sesión. El acceso OAuth completo no está probado contra cuentas reales.
- Adaptador de contrato SbobyPiShare y mock probado; documentación basada en su código real.
- Pruebas, benchmark, documentación, Dockerfile/Compose y workflow CI.

## Pendiente o no habilitado

| Capacidad                                              | Motivo / siguiente paso                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Login Google/Microsoft real                            | Registrar aplicación y aportar credenciales del despliegue; probar callback, expiración, logout y aislamiento con dos cuentas |
| Google Drive / OneDrive                                | No se dispone de credenciales ni almacenamiento de pruebas; faltan adaptadores, permisos, renovación y revocación             |
| SbobyPiShare remoto                                    | Transporte de producción, CAS/revisiones en upstream, credenciales y pruebas con relay/agente; ver documento específico       |
| Endpoints REST/WebDAV/S3/SFTP personalizados           | Superficie SSRF y secretos requiere implementación y prueba por protocolo                                                     |
| Avatares y creación de aristas por arrastre            | Flags reservadas; no se muestran controles que finjan esta funcionalidad                                                      |
| Comunidades Louvain/modularidad                        | Actualmente se muestran componentes conexos, nombrados como tales                                                             |
| Selector visual campo por campo en conflictos          | Se detectan campos afectados; resolución actual elige explícitamente una versión completa                                     |
| Cola offline persistente y backoff integrado           | Borrador permanece en memoria; reintento manual y exportación. Hay utilidad de backoff para futuras operaciones idempotentes  |
| Migración desde versiones anteriores                   | Solo existe esquema 1; otras versiones se rechazan de forma segura                                                            |
| Importar combinando dos redes                          | Importación actual reemplaza tras copia; no deduplica por semejanza de nombres                                                |
| Backups locales cifrados/retención configurable        | Cifrado y retención configurables están en el servidor; carpeta local conserva sus backups                                    |
| ZIP con todo el historial                              | ZIP contiene la red activa; para backup físico completo copiar el directorio con el servicio detenido                         |
| Perfil OAuth de preferencias y desvincular proveedores | Preferencias viven en la red aislada; revocación se realiza en el proveedor                                                   |
| Certificación WCAG y FPS en hardware diverso           | Hay navegación alternativa, labels y reduced motion; faltan auditoría integral y mediciones de frames                         |
| Docker y CI en GitHub ejecutados                       | Definiciones incluidas; Docker pendiente de ejecución. Repositorio GitHub privado autorizado para la alpha; consultar Actions para el resultado de CI                                                   |

## Próximo orden recomendado

1. Validar login con dos cuentas reales y revisar despliegue HTTPS.
2. Probar selector de carpeta física en los navegadores de destino y recuperación ante cierres abruptos.
3. Ampliar E2E de accesibilidad, concurrencia entre pestañas y rendimiento interactivo a 1.000 nodos.
4. Implementar CAS en SbobyPiShare y su transporte backend seguro.
5. Añadir Drive/OneDrive con credenciales de pruebas; después avatares, Louvain e importación combinada.
