# Modelo de datos

[English](data-model.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

La aplicación está en 1.1.1; el esquema sigue siendo `schemaVersion: 1`. Las definiciones vigentes están en `packages/domain/model.ts`, `images.ts`, `social.ts` y `packages/appearance/config.ts`. Se rechazan versiones desconocidas y referencias inválidas.

El snapshot contiene revisión, ownerId, deviceId, personas, conexiones, contadores, tombstones y preferencias. Cada red tiene identidad principal, nombre, banner, apariencia y posiciones propios.

Las personas tienen UUID y storageId inmutables (M/F/L/U más contador), perfil, posición y campos personalizados. Cambiar el género no renombra archivos existentes. Se admiten etiquetas, intereses, fechas, nacionalidades, notas, retrato JPEG recortado y hasta 20 perfiles sociales. Los límites de retrato y banner son 120.000 y 300.000 caracteres; viajan con las exportaciones.

Las conexiones ordenan ambos UUID y los unen con `::`. No se admiten autorrelaciones, parejas duplicadas ni extremos inexistentes. Incluyen mejores amigos, amigos estrechos, novios, crush y casados; la enumeración completa procede de `relationship-colors.json`.

Las percepciones de ambos extremos son tipos concretos. Los valores antiguos vacíos o sin definir toman el tipo general. Las marcas de percepción automática mantienen esa relación hasta personalizarla. Añadir un grupo de etiquetas conserva las conexiones existentes.

Los borrados generan tombstones. Deshacer/rehacer y restaurar son operaciones explícitas; los contadores no retroceden. Las fechas se guardan en ISO y solo su presentación depende del idioma. Por defecto se usa inglés y tema del sistema, respetando preferencias anteriores explícitas.
