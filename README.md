# ⚡ Bandwidth Hero Proxy 2

> A **serverless** image compression proxy — faster, leaner, and always on.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/himshim/bandwidth-hero-proxy2)
![JavaScript](https://img.shields.io/badge/JavaScript-80.8%25-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/github/license/himshim/bandwidth-hero-proxy2?style=flat-square)
![Forks](https://img.shields.io/github/forks/himshim/bandwidth-hero-proxy2?style=flat-square)
![Stars](https://img.shields.io/github/stars/himshim/bandwidth-hero-proxy2?style=flat-square)

A serverless port of the [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) data compression service. Images are compressed on the fly — no disk writes, no cold starts, no sleeping servers.

Forked from [adi-g15/bandwidth-hero-proxy](https://github.com/adi-g15/bandwidth-hero-proxy) and updated to be more current and less error-prone.

---

## Compatible Extensions

| Extension | Manifest | Description |
|---|---|---|
| 🛡️ [Bandwidth Guardian](https://github.com/himshim/bandwidth-guardian) | **MV3** | Recommended — actively maintained MV3 port with WebP, grayscale, quality control and max-width limiting. Works on Chrome, Kiwi, and Cromite. |
| [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) | MV2 | Original extension — MV2 only, no longer supported in Chrome. |

> **Recommended:** Use **Bandwidth Guardian** — it is a full Manifest V3 rewrite built specifically for this proxy, with support for `quality=`, `max_width=`, progressive JPEG output, and CDN caching.

---

## How It Works

The proxy sits between your browser (via the extension) and the web. When you visit a page, instead of loading full-resolution images directly, your browser sends image URLs to this service, which:

1. Fetches the original image (forwarding your headers, cookies, and IP)
2. Compresses and optionally converts it to grayscale
3. Returns a low-resolution [WebP](https://developers.google.com/speed/webp/) or JPEG — on the fly, with no disk I/O

Powered by [Sharp](https://github.com/lovell/sharp) for fast, high-quality image transformation.

> **Privacy note:** The proxy forwards your cookies and IP address to the origin host in order to access images that may require authentication or regional access.

---

## Why Serverless?

| | Traditional (e.g. Heroku) | This (Netlify Functions) |
|---|---|---|
| Cold start | Slow — server sleeps after inactivity | ✅ Always warm |
| Initial request speed | Delayed by wake-up time | ✅ Fast |
| Maintenance | Needs uptime monitoring | ✅ Managed by Netlify |
| Cost | Paid dynos or slow free tier | ✅ Free tier available |

---

## Self-Hosting Instructions

If you prefer to self-host this application instead of deploying it on Netlify, please see the [self-hosting guide](SELF_HOSTING.md) for detailed instructions on how to set up and run the application on your own server.

## Deployment

### One-Click Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/himshim/bandwidth-hero-proxy2)

Click the button above. Netlify will clone this repo to your account and deploy it automatically.

### Configure the Extension

After deployment, open the **Bandwidth Guardian** extension settings and set the **Proxy URL** to:

```
https://your-netlify-domain.netlify.app/api/index
```

Replace `your-netlify-domain` with the subdomain Netlify assigned to your deployment.

---

## API

The proxy accepts the following query parameters:

| Parameter | Values | Description |
|---|---|---|
| `url` | encoded URL | Image URL to fetch and compress (required) |
| `jpeg` | `0` or `1` | `1` = return JPEG (no WebP support), `0` = return WebP |
| `bw` | `0` or `1` | `1` = convert to grayscale |
| `quality` | `1`–`100` | Compression quality (default: 40) |
| `l` | `1`–`100` | Alias for `quality` (original extension compatibility) |
| `max_width` | integer px | Downscale images wider than this before compressing (`0` = no limit) |

A request with no `url` parameter returns `bandwidth-hero-proxy` — used by extensions to validate the service URL.

---

## Project Structure

```
bandwidth-hero-proxy2/
├── functions/        # Netlify serverless function (the compression logic)
├── tests/            # Test suite
├── util/             # Utility helpers
├── netlify.toml      # Netlify configuration
├── package.json      # Dependencies
└── index.html        # Landing page
```

---

## Tech Stack

- **Runtime:** Node.js (Netlify Functions)
- **Image processing:** [Sharp](https://github.com/lovell/sharp)
- **Output formats:** WebP, JPEG (progressive)
- **Platform:** [Netlify](https://netlify.com)

---

## Related Projects

- [Bandwidth Guardian](https://github.com/himshim/bandwidth-guardian) — MV3 extension built for this proxy
- [Bandwidth Hero](https://github.com/ayastreb/bandwidth-hero) — original MV2 extension
- [adi-g15/bandwidth-hero-proxy](https://github.com/adi-g15/bandwidth-hero-proxy) — the upstream fork this is based on

---

## License

[MIT](./LICENSE)
