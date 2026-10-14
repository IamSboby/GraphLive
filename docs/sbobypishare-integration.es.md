# Estado de integración SbobyPiShare

[English](sbobypishare-integration.md) · Español

Actualizado para GraphLive 1.1.1 · 14 de octubre de 2026.

SbobyPiShare no está habilitado en la interfaz. packages/storage-adapters/sbobypishare.ts contiene un adaptador con transporte inyectado y dobles de prueba; pasar pruebas con mocks no certifica una integración real.

La revisión anterior correspondía al commit afab04ac6048a7d4291bd01977ee87678bc8fcf0 de IamSboby/SbobyPiShare. Es referencia histórica, no contrato vigente. Cubría salud, listado/contenido de archivos, creación de carpetas y borrado con autorización bearer.

Antes de habilitarlo, revalida protocolo, escrituras condicionales, revisiones, atomicidad, credenciales limitadas, revocación, tiempos y tamaños. El transporte backend necesita controles de origen y SSRF. Prueba escritores simultáneos, permisos caducados, interrupciones y recuperación contra un despliegue autorizado real.

OneDrive tampoco está disponible. El login Microsoft del servidor es independiente del almacenamiento OneDrive.
