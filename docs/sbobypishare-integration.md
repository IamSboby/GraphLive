# SbobyPiShare integration status

English · [Español](sbobypishare-integration.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

SbobyPiShare is not enabled in the GraphLive interface. packages/storage-adapters/sbobypishare.ts contains an adapter with an injected transport and test doubles; passing mock tests does not certify a live cloud integration.

The earlier protocol review was against commit afab04ac6048a7d4291bd01977ee87678bc8fcf0 of IamSboby/SbobyPiShare. Treat it as a historical reference, not a current service contract. It covered health, file listing/content, directory creation and deletion using bearer authorization.

Before enabling a real connection, revalidate the upstream protocol, conditional writes/revisions, atomic snapshot semantics, scoped credentials, revocation, timeouts and size limits. A backend transport needs origin controls and SSRF protections. Test concurrent writers, expired permissions, interrupted requests and recovery against a real authorized deployment.

OneDrive is also unavailable. Server Microsoft login is separate from OneDrive storage and must not be presented as a working OneDrive integration.
