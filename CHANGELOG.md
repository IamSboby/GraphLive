# Changelog

## GitHub Pages — 2026-09-19

- Exportación estática con rutas bajo `/GraphLive/`, sin API ni almacenamiento remoto.
- Almacenamiento IndexedDB local con transacciones, copias y reapertura; despliegue automático con prueba de persistencia.
- Selector de carpeta vinculado a `window` y errores de permisos/cancelación específicos.
- Creación inicial usando la revisión cargada para evitar conflictos cuando una red vacía ya tiene historial.

## Conexiones directas opcionales — 2026-09-18

- Las personas nuevas solo se conectan con la persona principal al marcar «Conozco directamente a esta persona», desmarcado por defecto.
- Editar una persona sin conexión directa conserva esa ausencia de vínculo. Las conexiones existentes siguen siendo editables.
- Etiqueta disponible en español e inglés y prueba de regresión para ambos casos.

## Navegación y transiciones — 2026-09-18

- Páginas independientes de inicio, acceso y grafo (`/`, `/login`, `/graph`).
- Logotipo enlazado al inicio y acceso para retomar la red abierta sin perder el estado en la navegación interna.
- Presentación con acciones y ventajas, transiciones de entrada y paneles, animación decorativa y respeto al movimiento reducido.
- Redirección segura a acceso cuando no hay una red abierta, callbacks OAuth coherentes y selector de tema en las páginas públicas.

## Corrección de zoom — 2026-09-18

- Dimensiones explícitas en los SVG de banderas para impedir que Chromium recorte el dibujo al ampliar el lienzo.
- Prueba de regresión que verifica las tres franjas de Francia en siete cambios de zoom y la descarga PNG.

## 0.1.0-alpha.1 — 2026-09-17

- Primera alpha del núcleo local/servidor de GraphLive, con datos JSON, grafo, relaciones, filtros, métricas, backups y exportación.
- Selector de género: hombre, mujer, no binario, agénero, género fluido, genderqueer, bigénero, demigénero, otra identidad, sin especificar y prefiero no decirlo.
- Prefijo M/F/L/U calculado automáticamente al crear una persona, con vista previa del archivo. UUID y nombre de archivo existentes permanecen inmutables; se conserva el género libre de datos anteriores.
- Iconos SVG de banderas servidos localmente en fichas, formulario, grafo y exportación PNG; independientes de las fuentes de Windows.
- Interfaz ES/EN, opciones nuevas traducidas y conservación del idioma elegido al entrar en la demo. README adicional en inglés.
- Docker incluye los recursos públicos de banderas. Pruebas de regresión para idioma, prefijos y carga de iconos.

Estado alpha: consultar `docs/status.md` para capacidades pendientes y `docs/verification.md` para verificaciones ejecutadas.
