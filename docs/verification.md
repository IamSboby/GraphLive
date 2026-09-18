# Verificación de la entrega

Fecha: 17 de septiembre de 2026. Entorno: Windows, Node.js 24.21.0, npm 12.0.2, Microsoft Edge con Playwright. Datos usados: exclusivamente fixtures y demo ficticia.

| Comprobación                                           | Resultado                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Instalación limpia con lockfile en directorio separado | Instalación con lockfile; salida 0                                                         |
| `npm run typecheck`                                    | Pasa                                                                                       |
| `npm run lint`                                         | Pasa sin errores ni advertencias en código propio                                          |
| `npm test`                                             | **30 pruebas pasan**, 7 archivos                                                           |
| `npm run build`                                        | **Pasa**, salida 0; rutas y Worker compilados                                              |
| Playwright contra producción                           | **6 escenarios pasan**; incluye selector de género, prefijos automáticos, SVG y demo en inglés          |
| `npm audit` completo y `npm audit --omit=dev`          | **0 vulnerabilidades reportadas** en la ejecución; no sustituye una auditoría de seguridad |
| Revisión visual                                        | Capturas de grafo y móvil inspeccionadas; corregido solapamiento del layout                |
| Docker/Compose ejecutado                               | No; no se encontró CLI/daemon Docker disponible                                            |
| OAuth con cuentas reales                               | No; faltan credenciales y cuentas de integración                                           |
| Carpeta física mediante selector nativo                | No automatizada; adaptador probado con handles de prueba y permisos revocados              |
| SbobyPiShare remoto                                    | No; contrato y mock probados, revisión del código upstream documentada                     |

## Actualización alpha 0.1.0-alpha.1

Tipos, lint, 30 pruebas unitarias/integración y build comprobados nuevamente tras los cambios. Tres escenarios de demo/escritorio/móvil pasan con salida 0 en 24,3 s; también pasan los seis escenarios completos con servidor de pruebas. Captura del [formulario en inglés](screenshots/alpha-form-en.png).

## Cobertura relevante

Unitarias/integración: prefijos y contadores independientes, UUID inmutable, validación de nombres/cotas, intereses normalizados, búsqueda por acentos, clave A–B, prevención de duplicados y autorrelaciones, referencias inválidas, tombstones, tamaño acotado, afinidad, puentes, rutas, fusión independiente y conflictos, esquema desconocido, paridad ES/EN, archivos del servidor, reapertura, backup/restauración, aislamiento, escrituras concurrentes, traversal, corrupción, contrato SbobyPiShare, autenticación que falla de forma cerrada, cifrado y manipulación de backups, escritura en curso con ediciones en cola, permisos locales y separación de nodos.

E2E:

1. Demo, grafo/Worker, alta, edición, conexión, deshacer/rehacer, búsqueda, filtros, tema, idioma y JSON.
2. Onboarding servidor, persistencia y reapertura sin sobrescribir.
3. Vista móvil, formulario, búsqueda accesible y ausencia de desbordamiento horizontal.
4. API: origen indebido 403, datos inválidos 400, revisión obsoleta 409, copia y restauración.
5. Vista previa de importación, reemplazo de datos demo, ZIP y comprobación de que el servidor real de pruebas no cambia al importar en demo.

No se interpreta este conjunto como cobertura completa de todos los flujos del prompt maestro. No hay prueba real de OAuth/logout con proveedores, ni certificación WCAG, ni validación de un despliegue público.

## Rendimiento orientativo

Una ejecución de `npm run benchmark`:

| Nodos | Aristas | Validación | Métricas | Layout | JSON            |
| ----- | ------- | ---------- | -------- | ------ | --------------- |
| 500   | 1.990   | 82 ms      | 11 ms    | 518 ms | 1.449.906 bytes |
| 1.000 | 3.990   | 72 ms      | 14 ms    | 990 ms | 2.905.408 bytes |

Layout incluye 150 iteraciones ForceAtlas2 y separación espacial. En la aplicación corre en un Worker. Esta medición evalúa cálculo en Node, **no FPS, latencia de Canvas ni tiempo total de guardado**. El servidor reescribe las proyecciones del snapshot: medir escrituras y backups en el disco del despliegue antes de afirmar rendimiento con miles de identidades. Los tiempos varían por calentamiento del proceso y carga del equipo.

## Incidencias encontradas y resueltas

- TypeScript 6 deprecó `baseUrl`: se eliminó y se mantuvieron paths relativos.
- Se corrigieron tipos del formulario y de estilos Cytoscape.
- La primera prueba de persistencia agotó un timeout durante compilación de desarrollo simultánea con build. Los E2E finales usan producción.
- La primera captura mostró nodos superpuestos. Se activó consideración del tamaño en ForceAtlas2, se añadió separación por celdas y una prueba de distancia mínima/fijación.
- El benchmark inicial con `tsx` y después esbuild encontró limitaciones del host Windows. El runner final transpila sus módulos con TypeScript y termina correctamente.
- npm 12 rechazó un tarball opcional de Tailwind por su política de URLs. Instalación limpia verificada con `--allow-remote=all --registry=https://registry.npmjs.org`, tras comprobar que todas las URLs del lockfile pertenecen a ese host. Sin cambiar configuración global.
- La revisión automática del entorno rechazó arrancar manualmente el servidor de pruebas con variables de entorno. Se pudo usar el arranque integrado en Playwright. El cierre automático de ese proceso se bloqueó en el entorno restringido; ejecutar con `PLAYWRIGHT_EXTERNAL_SERVER=true` sobre ese servidor permitió finalizar los cinco casos con código 0.
- ESLint se actualizó a 10.10.0 al detectar que la rama 9 ya no tiene soporte. Los plugins React/import/a11y incluidos por Next aún declaran peers de ESLint 9: npm emite advertencias ERESOLVE. La configuración usa @eslint/compat 2.1.1, la utilidad oficial de compatibilidad, y el lint final pasa con salida 0. No se desactivan sus reglas. El postinstall de unrs-resolver permanece bloqueado por la política de npm del entorno; los comandos reales funcionan sin ejecutarlo.

Capturas: [grafo](screenshots/network.png) y [móvil](screenshots/mobile.png). Las capturas contienen únicamente datos de demostración.

## Corrección de banderas al ampliar — 18 de septiembre de 2026

Reproducido en Edge: los SVG sin dimensiones explícitas se recortaban hasta mostrar un único color al ampliar. Se añadieron dimensiones según el viewBox a 271 SVG. Una prueba nueva inspecciona los píxeles reales del lienzo para comprobar las franjas azul, blanca y roja de Francia en siete cambios de zoom (0,5; 1; 2; 3; 0,5; 3; 1,25), además de la descarga PNG. Pasa en 20,3 segundos.
