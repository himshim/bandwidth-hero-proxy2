# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-12

### Added
- **Interactive Diagnostics Suite**: Optional client-side testing interface embedded in `index.html` to audit proxy reachability, CORS configurations, compress throughput, and caching header integrity.
- **SSRF Redirect Traversal Filter**: Explicit path and DNS resolution scope filtering at each hop when following HTTP redirects.
- **Unified Validate Module**: Clean URL validation and private subnet check helper in `util/validate.js`.
- **Contribution Guidelines**: Added `CONTRIBUTING.md` defining engineering principles, dependency control rules, and release policies.

### Changed
- **Node Native Fetch Integration**: Migrated from the external `node-fetch` module to native Node.js global `Fetch` API, removing the package-lock footprint and streamlining lambdas.
- **Improved Parameter Readability**: Renamed parameters (`isTransparent` -> `useWebp`) to match calling interface.
- **Diagnostic Landing Page**: Redesigned the primary web template into a cleaner, modern dark layout focusing on user instructions.

### Removed
- **`node-fetch`**: Removed from `package.json` dependencies.
- **`util/pick.js`**: Inlined and deleted.

### Security
- **SSRF Hardening**: Custom `fetchWithRedirectCheck` manual redirect interception prevents SSRF attacks attempting to bypass filters via 3xx redirects to internal addresses.
