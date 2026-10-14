# Arquitectura

[English](architecture.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

GraphLive 1.1.1 usa Next.js App Router, React, TypeScript estricto y un único paquete npm. El mismo código genera un servidor Node o una web estática para GitHub Pages.

- `app/` contiene rutas y estilos; `packages/ui/`, dashboard, formularios, grafo y estado Zustand.
- `domain/` valida snapshots con Zod. `storage-core/` define repositorios, exportación, copias y la cola persistente de IndexedDB.
- `storage-adapters/` implementa navegador, carpeta, servidor y Google Drive. `sync-engine/` fusiona revisiones base, local y remota.
- Cytoscape dibuja el grafo. Un Worker de Graphology/ForceAtlas2 calcula la distribución; se conservan posiciones al reabrir y las personas nuevas se acercan a etiquetas coincidentes.
- Nodos y conexiones aparecen con animaciones independientes. Se respeta el movimiento reducido y los destellos de Casados desaparecen al alejar el zoom.
- La dashboard muestra resúmenes en caché antes de actualizar detalles y descubrir redes. Su paleta neutra es independiente del tema de cada red.

El inglés es inicial y de respaldo; español, italiano, alemán, francés y portugués siguen disponibles. Se respeta el idioma guardado. Banderas y logos son recursos SVG locales.

La edición Node usa sesiones next-auth y disco privado. La estática no tiene API de servidor: la autorización de Google se realiza en el navegador. Son flujos distintos.

Centralidad de grado, componentes y afinidad describen lo registrado, no características objetivas de las personas. No hay analítica remota ni inferencia social.
