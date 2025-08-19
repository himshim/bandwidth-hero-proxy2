const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = process.env.DEFAULT_QUALITY || 40;

// A realistic browser UA to avoid hotlink/CDN blocks
const REAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function respond(statusCode, body, {
  contentType = "text/plain; charset=utf-8",
  extraHeaders = {},
  isBase64Encoded = false
} = {}) {
  return {
    statusCode,
    body,
    isBase64Encoded,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "content-type": contentType,
      "content-encoding": "identity",
      "cache-control": "no-cache",
      ...extraHeaders,
    }
  };
}

exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || "GET").toUpperCase();

    if (method === "OPTIONS") return respond(204, "");
    if (method === "HEAD") return respond(200, "");

    const { url, jpeg, bw, l } = event.queryStringParameters || {};

    // Handshake string expected by the extension
    if (!url) {
      return respond(200, "bandwidth-hero-proxy", { contentType: "text/plain" });
    }

    // Normalize URL
    let targetUrl = url;
    try { targetUrl = JSON.parse(url); } catch {}
    if (Array.isArray(targetUrl)) targetUrl = targetUrl.join("&url=");
    targetUrl = targetUrl.replace(
      /http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i,
      "http://"
    );

    const useWebp   = !jpeg;            // default WebP unless jpeg=1
    const grayscale = bw == "1";
    const quality   = parseInt(l, 10) || DEFAULT_QUALITY;

    // Derive fallback referer
    let refererFallback = "";
    try { refererFallback = new URL(targetUrl).origin + "/"; } catch {}

    // Fetch original image
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...pick(event.headers || {}, ["cookie", "dnt", "referer"]),
        referer: (event.headers && event.headers.referer) || refererFallback || undefined,
        "user-agent": REAL_UA,
        "x-forwarded-for": (event.headers && event.headers["x-forwarded-for"]) || event.ip,
        via: "1.1 bandwidth-hero",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return respond(response.status, "Failed to fetch image", {
        extraHeaders: { "x-bh-debug": `fetch_not_ok:${response.status}` }
      });
    }

    const arrayBuf    = await response.arrayBuffer();
    const sourceBuf   = Buffer.from(arrayBuf);
    const contentType = response.headers.get("content-type") || "";
    const originalLen = sourceBuf.length;

    // Decide to compress or bypass
    const should = shouldCompress(contentType, originalLen);

    if (!should) {
      // IMPORTANT: include content-length on bypass too
      return respond(
        200,
        sourceBuf.toString("base64"),
        {
          contentType: contentType || "application/octet-stream",
          isBase64Encoded: true,
          extraHeaders: {
            "content-length": String(originalLen),
            "x-bh-debug": `bypass:${contentType}|len=${originalLen}|useWebp=${useWebp}`,
            "x-original-size": String(originalLen),
            "x-bytes-saved": "0"
          }
        }
      );
    }

    // Compress with Sharp
    const { err, output, headers } = await compress(
      sourceBuf,
      useWebp,
      grayscale,
      quality,
      originalLen
    );

    if (err) {
      return respond(500, "Compression failed", {
        extraHeaders: { "x-bh-debug": "sharp_error" }
      });
    }

    return {
      statusCode: 200,
      body: output.toString("base64"),
      isBase64Encoded: true,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,HEAD,OPTIONS",
        "content-encoding": "identity",
        "cache-control": "no-store",
        "x-bh-debug": `compressed|q=${quality}|grayscale=${grayscale}|useWebp=${useWebp}`,
        ...headers, // includes `content-type`, `content-length`, `x-original-size`, `x-bytes-saved`
      }
    };
  } catch (e) {
    return respond(500, `Error: ${e.message || "Internal Error"}`, {
      extraHeaders: { "x-bh-debug": "exception" }
    });
  }
};