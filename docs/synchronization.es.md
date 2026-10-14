# Sincronización y recuperación

[English](synchronization.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

Las ediciones actualizan el estado local y entran en una cola persistente IndexedDB. Un bucle de guardado en segundo plano agrupa cambios posteriores sin bloquear el tema ni nuevas ediciones. Las escrituras están asociadas a almacenamiento, cuenta y red.

Se envía la revisión esperada; Drive añade escritura condicional. Ante conflicto se comparan versiones base, local y remota. Los cambios independientes se fusionan; los incompatibles requieren decisión explícita. Exporta la versión pendiente antes de descartarla. Los arrays se tratan como valores completos, sin unirlos a ciegas.

Con la página visible y conexión, las redes compartidas se consultan aproximadamente cada 3 segundos y las demás cada 15; los errores aumentan la espera. Volver a la pestaña o recuperar conexión solicita actualización. Es consulta periódica, no entrega instantánea garantizada.

Compartir espera el guardado pendiente antes de invitar. Drive gestiona lectura, edición y revocación individual. Revocar impide acceso futuro autorizado, pero no borra copias descargadas. Si se pierde acceso, se conservan los cambios locales para recuperarlos.

Las posiciones guardadas permanecen estables al reabrir. Los resúmenes de dashboard son caché, no el snapshot definitivo, y se actualizan desde el repositorio. No borres datos del sitio si necesitas cambios sin sincronizar.
