# Contributing Guidelines

Thank you for considering contributing to **Bandwidth Hero Proxy 2**! This project is guided by a singular, focused mission:

> **"The easiest, most reliable, free, one-click deployable Bandwidth Hero proxy that anyone can deploy in minutes."**

---

## 🧭 Engineering Principles

Every proposed change or pull request should satisfy at least one of the following criteria:
* **Makes deployment easier**: Reduces friction or setup steps for new users.
* **Improves reliability**: Hardens error handling, edge cases, timeouts, or security boundaries.
* **Improves compatibility**: Fixes issues with legacy/modern browser extensions or legitimate image CDNs.
* **Improves performance without increasing complexity**: Speeds up cold starts or reduces response latency without adding layers of abstractions.
* **Reduces maintenance burden**: Cleans up obsolete parameters, dead code, or refactors safely.

If a proposed change satisfies none of these, it will not be accepted.

### Implementation Preferences:
1. **Prefer simpler code** over clever abstractions.
2. **Prefer fewer dependencies** to keep the footprint tiny.
3. **Prefer backward compatibility** at all times to prevent breaking active client extensions.
4. **Prefer serverless-first solutions** matching free tier environments.
5. **Benchmark before optimizing**. Do not optimize based on assumptions.

---

## 📦 Dependency Policy

This project's greatest asset is its minimal size. 
- **Justification**: Adding any third-party dependency requires clear justification and demonstration of a major benefit that cannot reasonably be achieved with Node's standard library.
- **Preference**: Removing or inlining custom utilities is preferred over adding packages.
- **Standard Library**: Always prefer native Node.js functionality (e.g., global `Fetch API`, `AbortController`, `Buffer`) over third-party equivalents.

---

## 🏷️ Release Policy

- **Patch releases**: Strictly for bug fixes, security patches (e.g. SSRF updates), latency improvements, and internal code cleanups.
- **Minor releases**: Adding optional configuration features (e.g. environment variables), new diagnostic tools, or updating documentation.
- **Major releases**: Required only for breaking changes to:
  - The API boundaries.
  - Query parameter interfaces.
  - Base64/response format specifications.
  - Overall deployment processes.

---

## 🧪 Testing Guidelines

Before opening a PR, ensure all tests pass:
```bash
npm test
```

All contributions that alter request handling or add features must include tests matching one of these categories:
- **Compatibility tests**: Validate that legacy and modern extension requests behave identically.
- **Security tests**: Test host validation blocks (SSRF) and redirect traversal filters.
- **Image pipeline tests**: Verify aspect-ratio resizing, grayscale output, and formats.

> [!NOTE]
> **SSRF & DNS Rebinding Limitation**: The hostname checks performed by `isPrivateHost` operate on the query URL hostname string. Because it does not perform asynchronous DNS resolution prior to HTTP dialing, it does not fully prevent DNS Rebinding attacks. This is a deliberate design trade-off to keep the proxy lightweight, serverless-first, and zero-configuration. Contributions trying to implement DNS resolution must ensure it does not increase latency or cold start overhead.
