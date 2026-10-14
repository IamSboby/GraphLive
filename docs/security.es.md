# Seguridad y privacidad

[English](security.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

GraphLive no incorpora analítica ni publicidad. Procesa la red localmente y la envía al almacenamiento elegido expresamente. GitHub Pages sirve la aplicación pública; Google recibe la red cuando se usa Drive.

Google usa `drive.appdata` para datos privados y `drive.file` para archivos creados o seleccionados al compartir. No permite descubrir todo Drive sin restricciones. Tokens en memoria; el Client ID OAuth y una clave restringida de Picker no son secretos de cliente. No subas tokens, contraseñas, archivos .env ni redes personales.

La edición Node valida sesión cuando está activada, origen, esquema y límites de tamaño. Restringe rutas, rechaza traversal y aplica revisiones y límites por proceso. Su middleware usa CSP con nonce y cabeceras; Pages estático no ejecuta ese middleware.

JSON activo y exportaciones no tienen cifrado de extremo a extremo. El cifrado opcional AES-256-GCM del servidor protege copias, no datos activos. Protege dispositivo, permisos y claves. Cachés y cambios pendientes pueden contener datos personales.

Compartir da acceso a toda la red, incluidas notas y fotos. Revocar no recupera copias descargadas. Borrar registros no elimina backups anteriores. Revisa todos los almacenamientos y exportaciones para una eliminación completa.

El modo servidor sin autenticación es compartido y debe quedar en localhost o tras controles adecuados. No se afirma soporte distribuido, auditoría independiente ni certificación WCAG.

Políticas públicas: [privacidad](https://iamsboby.github.io/GraphLive/privacy/) y [condiciones](https://iamsboby.github.io/GraphLive/terms/). Contacto: Iamsboby@gmail.com.
