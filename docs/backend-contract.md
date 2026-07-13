# Bandwidth Proxy 2 — Backend Contract

**Version:** 2.0.0  
**API:** 1  
**Status:** Stable

This document is the authoritative public specification for all clients (browser extensions, test harnesses, monitoring systems) that communicate with Bandwidth Proxy 2.

---

## Base URL

```
https://<your-deployment-url>/api
```

All endpoints listed below are relative to this base.

---

## Query Parameters

These parameters are accepted by the image proxy endpoint (`GET /api/index`).  
**None of these will be removed or renamed.** This is the stable, versioned API surface.

| Parameter   | Type   | Default | Description                                                                         |
|-------------|--------|---------|-------------------------------------------------------------------------------------|
| `url`       | string | —       | **Required.** Full URL of the upstream image to fetch and compress.                 |
| `quality`   | number | `40`    | Compression quality, 1–100. Higher = better quality, larger file.                   |
| `l`         | number | `40`    | Legacy alias for `quality` (original Bandwidth Hero extension compat). Both work.   |
| `bw`        | `"1"`  | `"0"`   | Set to `"1"` to request grayscale output. Any other value disables grayscale.       |
| `jpeg`      | `"1"`  | `"0"`   | Set to `"1"` to request JPEG output. Omit or use `"0"` for WebP (default).         |
| `max_width` | number | `0`     | Downscale image to this pixel width before compressing. `0` means no limit.         |

### Backward Compatibility Notes

- `quality` and `l` are both accepted and produce identical behaviour. Clients sending either or both are fully supported.
- `jpeg=0` and omitting `jpeg` are equivalent — both produce WebP output.
- `bw=0` and omitting `bw` are equivalent — both produce colour output.
- `max_width=0` and omitting `max_width` are equivalent — no resize is applied.

---

## Endpoints

### `GET /api/index`

Fetches, validates, and compresses an upstream image.

**Success (compressed):**

```
HTTP/1.1 200 OK
Content-Type: image/webp        (or image/jpeg when jpeg=1)
Content-Encoding: identity
Cache-Control: public, s-maxage=604800, max-age=3600, stale-while-revalidate=86400
X-BH-Backend: bandwidth-proxy-2
X-BH-Version: 2.0.0
X-BH-Api: 1
X-BH-Features: webp,grayscale,maxwidth,stats
X-BH-Original-Size: <bytes>
X-BH-Compressed-Size: <bytes>
X-BH-Bytes-Saved: <bytes>
x-original-size: <bytes>       (legacy alias, preserved for compat)
x-bytes-saved: <bytes>         (legacy alias, preserved for compat)
```

**Success (bypass — image too small to benefit from compression):**

```
HTTP/1.1 200 OK
Content-Type: <upstream content-type>
X-BH-Backend: bandwidth-proxy-2
X-BH-Original-Size: <bytes>
X-BH-Compressed-Size: <bytes>   (equal to original)
X-BH-Bytes-Saved: 0
```

**Error responses:**

| Code | Reason                                                  |
|------|---------------------------------------------------------|
| 400  | `url` parameter is missing or is not a valid HTTP URL.  |
| 403  | `url` resolves to a private/internal host (SSRF guard). |
| 415  | Upstream returned a non-image content-type.             |
| 504  | Upstream fetch timed out (> 8 seconds).                 |
| 500  | Internal error during compression or upstream fetch.    |

---

### `GET /api/health`

Lightweight uptime and capability check. Safe to poll with no side-effects.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "status":   "ok",
  "service":  "Bandwidth Proxy 2",
  "version":  "2.0.0",
  "api":      1,
  "features": ["webp", "grayscale", "maxwidth", "stats"]
}
```

| Field      | Type     | Description                                                         |
|------------|----------|---------------------------------------------------------------------|
| `status`   | string   | Always `"ok"` when the function is alive.                           |
| `service`  | string   | Human-readable service identifier.                                  |
| `version`  | string   | SemVer of this proxy deployment.                                    |
| `api`      | integer  | API contract version. Currently `1`. Incremented on breaking changes.|
| `features` | string[] | Features available in this deployment.                              |

---

## Response Headers

### Telemetry Headers (`X-BH-*`)

All successful image responses include the following protocol headers.  
Header names are **lowercase** as delivered over HTTP/2 (header names are case-insensitive per RFC 7230).

| Header                 | Type   | Description                                                              |
|------------------------|--------|--------------------------------------------------------------------------|
| `x-bh-backend`         | string | Fixed identifier `bandwidth-proxy-2`.                                    |
| `x-bh-version`         | string | SemVer of the proxy that handled the request (e.g. `2.0.0`).             |
| `x-bh-api`             | string | Integer API version as a string (e.g. `"1"`).                            |
| `x-bh-features`        | string | Comma-separated list of active features (e.g. `webp,grayscale,...`).     |
| `x-bh-original-size`   | string | Original upstream image size in bytes.                                   |
| `x-bh-compressed-size` | string | Output image size in bytes after compression (equals original on bypass).|
| `x-bh-bytes-saved`     | string | Bytes saved (`original − compressed`). `"0"` when bypass applies.       |

### Legacy Headers (preserved for backward compatibility)

These headers were present in v1 and remain in all responses.  
Clients should prefer the `x-bh-*` equivalents going forward.

| Header            | Equivalent             |
|-------------------|------------------------|
| `x-original-size` | `x-bh-original-size`   |
| `x-bytes-saved`   | `x-bh-bytes-saved`     |

---

## Feature List

The `features` array in `/api/health` and `x-bh-features` header enumerate active capabilities.

| Feature     | Description                                                                |
|-------------|----------------------------------------------------------------------------|
| `webp`      | WebP output format supported (default when `jpeg` param is omitted).       |
| `grayscale` | Grayscale conversion supported via `bw=1` parameter.                       |
| `maxwidth`  | Width-based downscaling supported via `max_width` parameter.               |
| `stats`     | Per-response size telemetry exposed in `x-bh-*` headers.                  |

---

## API Versioning

- `api: 1` is the initial stable contract.
- The `api` integer will be incremented **only** on breaking changes (parameter removal, response format change).
- Additive changes (new optional parameters, new response headers) do **not** increment the `api` version.
- Clients should check `api` from `/api/health` to determine compatibility, not `version`.

---

## CORS

All endpoints expose the following CORS headers unconditionally:

```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: *
```

Pre-flight `OPTIONS` requests are answered with `204 No Content`.

---

## Security Constraints

- The `url` parameter must be a valid `http://` or `https://` URL. Non-HTTP schemes are rejected with `400`.
- Hostnames resolving to RFC 1918 / loopback / link-local ranges are rejected with `403` to mitigate SSRF.
- **Known limitation:** Host validation is performed on the URL string only. DNS rebinding after validation is a known and accepted risk given the serverless cold-start constraint. See `CONTRIBUTING.md` for details.

---

## Caching

Successful responses are served with:

```
Cache-Control: public, s-maxage=604800, max-age=3600, stale-while-revalidate=86400
```

The Netlify CDN uses the full proxy URL (including all query parameters) as the cache key, so every unique `url + quality + bw + jpeg + max_width` combination is cached independently. CDN cache hits bypass this function entirely.

---

*This document is generated and maintained as part of the Bandwidth Proxy 2 release process. Open a PR to propose changes.*
