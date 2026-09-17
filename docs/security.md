# Seguridad y privacidad

## Protecciones implementadas

- Sin analítica, fuentes remotas ni envío externo de la red. `NEXT_TELEMETRY_DISABLED=1` desactiva también la telemetría de Next durante desarrollo/build.
- React representa nombres y notas como texto; no se interpreta HTML del usuario.
- Zod en ambos lados, referencias y claves únicas; límite por bytes durante lectura del cuerpo, además del límite de entidades.
- API privada comprueba sesión en el servidor cuando `AUTH_ENABLED=true`; ninguna decisión depende de ocultar controles.
- Comprobación de Origin para PUT/POST; configurar `NEXTAUTH_URL` exactamente con el origen público. OAuth usa state y PKCE. Auth.js gestiona cookies HttpOnly/SameSite; Secure cuando la URL es HTTPS.
- CSP con nonce aleatorio por respuesta y `strict-dynamic`; sin `unsafe-inline` para scripts. Estilos inline permitidos por la visualización. `unsafe-eval` solo en desarrollo.
- Protección contra frames, MIME sniffing, referencias y permisos innecesarios del navegador.
- Rutas relativas restringidas, rechazo de traversal y enlaces simbólicos en componentes administrados por el adaptador. DATA_DIR debe ser controlado por el administrador y no modificable por usuarios locales no confiables.
- Archivos 0600 y directorios 0700 cuando el sistema los aplica. En Windows, configurar ACL del directorio; los bits POSIX no sustituyen sus permisos.
- 120 solicitudes por minuto e identidad dentro del proceso; desplegar además rate limiting y límites de conexión en el proxy.
- Logs estructurados con campos permitidos. No se registran nombres, notas, cuerpos, tokens ni rutas con información privada. El diagnóstico descargable omite datos personales.
- Secretos solo en variables de entorno; no se exportan. Backups opcionalmente AES-256-GCM con `BACKUP_ENCRYPTION_KEY` de 64 caracteres hexadecimales.

## Riesgos y límites conocidos

El modo sin autenticación es una instancia compartida. Los comandos arrancan en loopback; no exponerla a Internet sin autenticación o una protección equivalente. El administrador del servidor puede leer JSON activos: usar cifrado de disco y controles de acceso. El cifrado opcional protege backups, no datos activos ni exportaciones JSON/ZIP. No es cifrado de extremo a extremo.

La clave de backups no se almacena con los archivos. Perderla impide restaurarlos; conservarla en un gestor de secretos y guardar copias fuera del dispositivo. Cambiarla requiere conservar las claves anteriores para backups antiguos.

El rate limit es por proceso, no distribuido. El formato snapshot completo puede consumir memoria en redes muy grandes. No hay soporte multiinstancia validado, auditoría independiente, pentest ni certificación WCAG. Los proveedores OAuth están configurados en código pero el login real requiere credenciales del propietario y validación contra esas cuentas.

Drive, OneDrive, endpoints arbitrarios y SbobyPiShare no están habilitados: no existe un proxy genérico que acepte URLs del navegador. Esta restricción evita abrir una superficie SSRF no revisada. Implementar DNS pinning, rechazo de IP privadas por defecto, allowlist administrativa, límites, redirects desactivados y credenciales backend antes de habilitarlos.

«Eliminar toda la red» conserva un backup: es recuperable. Para supresión definitiva, detener el servicio y eliminar el espacio y todas sus copias mediante un procedimiento administrativo verificado; no se promete borrado seguro físico de SSD desde la aplicación.
