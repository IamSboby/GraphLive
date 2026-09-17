# Integración SbobyPiShare: revisión verificable

Repositorio inspeccionado: https://github.com/IamSboby/SbobyPiShare

Commit: `afab04ac6048a7d4291bd01977ee87678bc8fcf0`.

Archivos revisados: `docs/SERVER_INTEGRATION.txt`, `sdk/src/index.js`, `server/src/app.js`, `client/filesystem.js`, y pruebas de integración del proyecto. No se ha supuesto una API WebDAV o S3.

## Interfaces existentes

| Método y ruta                                  | Uso                                                    |
| ---------------------------------------------- | ------------------------------------------------------ |
| `GET /health`                                  | Estado del relay; no prueba acceso al agente o recurso |
| `GET /v1/shares/:share/files?path=...`         | Listado `{ entries: [...] }`                           |
| `GET /v1/shares/:share/files/content?path=...` | Descarga binaria                                       |
| `PUT /v1/shares/:share/files/content?path=...` | Escritura de archivo                                   |
| `POST /v1/shares/:share/directories?path=...`  | Crear directorio                                       |
| `DELETE /v1/shares/:share/files?path=...`      | Eliminar archivo                                       |

Autenticación: `Authorization: Bearer <token>`; permisos por agente, recurso, operación y prefijo. Credenciales administrativas y secretos de agente son distintos del token de acceso. El backend debe conservar el token; nunca el navegador. Errores documentados: 401, 403, 413, 429 y 504. El agente escribe archivos mediante temporal y rename, pero la API no expone comparación de revisión ni una transacción distribuida.

## Qué entrega GraphLive

`SbobyPiShareAdapter` implementa el contrato conocido sobre un transporte inyectado. `remoteRoot` permite definir el prefijo remoto. `MockSbobyTransport` es un fixture funcional identificado como mock y utilizado en las pruebas; nunca se inyecta en la interfaz real. Se prueban lectura, escritura, listado, borrado, ausencia de archivo y rechazo de una operación no soportada.

No hay credenciales de un relay desplegado en este proyecto; no se ha probado el acceso real. El proveedor aparece no disponible y la feature flag no lo habilita. No se incluye un botón que simule una conexión exitosa.

## Cambios necesarios antes de habilitarlo

1. Añadir en SbobyPiShare escritura condicional `If-Match`/ETag o `expectedRevision` atómica en el agente, devolviendo 409/412 si cambia. Debe cubrir leer-comparar-escribir bajo el mismo bloqueo.
2. Exponer creación exclusiva y/o transacciones de snapshot, y metadatos ETag fiables. `move()` falla de forma explícita hasta existir una API de renombrado atómico; copiar y borrar no es equivalente.
3. Implementar en GraphLive un transporte HTTPS solo backend con URL configurada por administrador, allowlist, resolución DNS fijada por conexión, límites, timeout y redirects rechazados. Las redes privadas requieren excepción administrativa explícita.
4. Añadir secretos por usuario cifrados, revocación y rotación; probar permisos mínimos `list/read/write/mkdir` para un prefijo dedicado.
5. Ejecutar prueba real con relay y agente: permisos, expiración, pérdida de red, dos escritores y archivos grandes. Solo entonces añadir la pantalla de conexión y la opción de almacenamiento.

El repositorio dispone de una API útil, pero la falta de CAS y de credenciales de integración impide certificar actualmente la sincronización remota de GraphLive. No se ha modificado SbobyPiShare.
