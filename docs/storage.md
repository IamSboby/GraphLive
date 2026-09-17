# Almacenamiento

## Servidor

La ubicación es `DATA_DIR/<sha256-identidad>/GraphLiveFiles`. Por defecto `DATA_DIR=./data`; debe quedar fuera de `public/`. Una instancia sin autenticación utiliza `local-instance` como identidad y, por tanto, un único espacio compartido.

```text
GraphLiveFiles/
├── Identities/       # M1.json, F1.json, L1.json, U1.json…
├── sync/
│   ├── snapshot.json # fuente de verdad y punto de commit
│   ├── connections.json
│   ├── counters.json
│   ├── index.json
│   ├── versions.json
│   ├── tombstones.json
│   ├── layout.json
│   └── sync-state.json
├── settings/
│   ├── preferences.json
│   ├── feature-flags.json
│   └── storage.json
└── backups/          # aparece al crear la primera copia
```

No se almacenan tokens, credenciales ni secretos en este árbol. `media/` queda reservado para avatares futuros. Los archivos de configuración exportados contienen únicamente información pública; los flags efectivos se resuelven centralmente desde el entorno del servidor.

Cada archivo se escribe en un temporal único, se sincroniza y se renombra. Un bloqueo exclusivo `.write.lock` serializa transacciones del espacio. Revisiones distintas devuelven conflicto 409. Se permite una instancia Node con disco local: no se afirma coordinación distribuida fiable sobre NFS/SMB.

Si el proceso cae entre commit y proyecciones, `snapshot.json` mantiene el estado confirmado; la próxima escritura regenera proyecciones. No editar directamente identidades o índices: no son una API de escritura. Si faltase snapshot en una carpeta que ya contiene datos, se rechaza la inicialización para no pisarlos.

Si queda `.write.lock` tras terminar abruptamente el proceso, detener todas las instancias que usen ese espacio, copiar el directorio completo, comprobar que no hay escritores vivos y retirar ese archivo de bloqueo. No se rompen bloqueos automáticamente basándose solo en su antigüedad.

## Carpeta local

El usuario debe elegirla mediante File System Access API. Se comprueba el permiso en cada lectura y escritura. Tras recargar, volver a elegir la carpeta revalida el acceso y detecta el snapshot existente. No se guarda una autorización permanente ni se promete acceso al disco fuera del selector.

El snapshot se escribe al final de las proyecciones usando `createWritable()`. Web Locks evita dos guardados del mismo origen y navegador. **No coordina procesos externos, perfiles distintos ni otros dispositivos.** Para estos usos debe elegirse el servidor con revisiones. Los navegadores sin API pueden usar servidor e importación/exportación manual.

## Importación y exportación

JSON contiene el snapshot. ZIP contiene las proyecciones de la red actual bajo `GraphLiveFiles/`; no incluye el historial de backups ni secretos. Antes de restaurar se muestra un resumen y se crea una copia de la red actual. Restaurar reemplaza la red; no existe todavía una importación que mezcle dos redes distintas. Los duplicados y referencias inválidas se rechazan, no se eliminan silenciosamente.

El límite de carga predeterminado es 10 MiB. ZIP se limita también por tamaño declarado descomprimido antes de extraer. No se escriben rutas proporcionadas por ZIP al sistema de archivos. La integridad se comprueba por esquema y referencias; las copias cifradas añaden autenticación AES-GCM.

## Adaptadores

`StorageAdapter` define operaciones sobre archivos; `Repository` define load/save con revisión y backups. `FileAdapter`, `ServerRepository`, `HttpRepository` y `LocalRepository` son implementaciones independientes. SbobyPiShare contiene un contrato con transporte inyectable y mock explícito, no una conexión habilitada en producción.
