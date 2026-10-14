# Almacenamiento y copias

[English](storage.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

El almacenamiento se elige en `/login/`; después la dashboard gestiona varias redes independientes. Navegador, carpeta, Google Drive y servidor Node usan contratos comunes, con garantías diferentes.

- **Navegador:** transacciones IndexedDB y copias locales. Los datos pertenecen al perfil y origen web. Borrar datos del sitio elimina también cola, caché y redes locales.
- **Carpeta:** requiere permiso de File System Access. Web Locks coordina el mismo navegador/origen, no procesos externos ni otros dispositivos.
- **Drive:** redes privadas en appDataFolder y compartidas en un archivo ordinario autorizado. Tokens en memoria; reconectar con la misma cuenta recupera escrituras pendientes.
- **Servidor:** `DATA_DIR/<hash-identidad>/GraphLiveFiles` privado, reemplazo atómico, bloqueo exclusivo y revisión. Diseñado para una instancia con disco local.

La cola local persistente permite seguir editando durante las escrituras remotas. «Guardado en este dispositivo» no confirma el guardado cloud. Si falla la recuperación o autorización, conserva una exportación independiente.

Drive crea como máximo una copia automática cada 15 minutos al guardar y conserva 20. Las manuales nuevas no se eliminan automáticamente. La limpieza de copias antiguas pide confirmación y conserva las últimas 20 antiguas. El navegador retiene 10; el servidor usa `BACKUP_KEEP` (10 por defecto). La limpieza ocurre mientras se usa la aplicación.

JSON incluye el snapshot. ZIP incluye la red actual bajo `GraphLiveFiles/`, con imágenes incrustadas, sin historial de copias ni secretos. Importar desde la dashboard crea otra red; restaurar en una red abierta muestra una vista previa y la sustituye tras crear copia. Se validan estructura y tamaños.

En servidor, el snapshot es el punto de commit; identidades e índices son proyecciones. No las edites como sustituto de importar un snapshot válido. Ante un bloqueo residual, detén escritores, copia la carpeta y verifica que ningún proceso la usa antes de quitar el bloqueo. No inicialices sobre una red incompleta.
