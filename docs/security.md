# Security and privacy

English · [Español](security.es.md)

Updated for GraphLive 1.1.1 · 14 October 2026.

GraphLive has no application analytics or advertising. Network data is processed locally and sent to the storage provider explicitly selected by the user. GitHub Pages serves public application files; Google receives network content when Drive is used.

Google access uses `drive.appdata` for private application storage and `drive.file` for files created or explicitly selected for sharing. It does not grant unrestricted Drive discovery. Access tokens stay in memory; public OAuth client IDs and a restricted Picker API key are not client secrets. Never commit tokens, passwords, .env files or personal snapshots.

The Node edition validates sessions when authentication is enabled, request origins, schema and size limits. It restricts filesystem paths, rejects traversal, uses revision checks and process-level rate limits. Its middleware applies nonce-based CSP and security headers; static Pages does not execute that middleware.

Active JSON and exported ZIP/JSON files are not end-to-end encrypted. Optional server backup encryption uses AES-256-GCM; it does not encrypt active data. Protect the device, storage permissions and encryption keys. Browser caches and pending writes may contain personal data.

Sharing grants access to the complete network, including notes and portraits. Revoking access cannot retract copies already downloaded. Deleting active records does not erase historical backups. Review all storage locations and exports when deleting data permanently.

Unauthenticated server mode is a shared instance and must stay on localhost or behind appropriate access control. No distributed multi-instance guarantee, independent security audit or WCAG certification is claimed.

Public policies: [privacy](https://iamsboby.github.io/GraphLive/privacy/) and [terms](https://iamsboby.github.io/GraphLive/terms/). Contact: Iamsboby@gmail.com.
