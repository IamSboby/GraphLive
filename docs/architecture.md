# Architecture

English · [Español](architecture.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

GraphLive 1.1.1 uses Next.js App Router, React, strict TypeScript and a single npm package. The same source builds a Node server or a static GitHub Pages site.

- `app/` owns routes and styles; `packages/ui/` owns the dashboard, editors, graph and Zustand state.
- `domain/` validates snapshots with Zod. `storage-core/` defines repositories, exports, backup policies and the durable IndexedDB outbox.
- `storage-adapters/` implements browser, folder, server and Google Drive persistence. `sync-engine/` merges base, local and remote revisions.
- Cytoscape renders the graph. A Graphology/ForceAtlas2 worker computes layouts; saved positions are preserved when reopening. New nodes are placed near matching tags.
- Network entry animates nodes and connections independently. Reduced motion disables decorative movement; married-relationship sparkles disappear when zoomed out.
- The dashboard renders cached network summaries before refreshing details and discovering networks. Its neutral palette is separate from each network's theme.

English is the initial and fallback language; Spanish, Italian, German, French and Portuguese remain available. Explicit saved language preferences take precedence. Flags and social logos are local SVG assets.

The Node edition uses next-auth sessions and private disk storage. The static edition has no server API: Google authorization happens in the browser. These are separate authentication flows.

Degree centrality, connected components and recorded affinity describe the entered network, not objective personal characteristics. No remote analytics or social inference is performed.
