const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = process.env.DEFAULT_QUALITY || 40;

// Small helper to ensure consistent headers (CORS + plain text default)
function withHeaders(statusCode, body, extra = {}, isBase64Encoded = false) {
  return {
    statusCode,
    body,
    isBase64Encoded,
    headers: {
      // CORS: allow extension/background scripts
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      // For plain text responses
      "content-type": extra["content-type"] || "text/plain; charset=utf-8",
      // identity to avoid weird encodings
      "content-encoding": "identity",
      ...extra,
    },
  };
}

exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || "GET").toUpperCase();

    // Handle preflight / HEAD cleanly so the extension is happy
    if (method === "OPTIONS") {
      return withHeaders(204, ""); // No Content
    }
    if (method === "HEAD") {
      // Return the same headers the GET would return for validation
      return withHeaders(200, "");
    }

    // Query params
    const { url, jpeg, bw, l } = event.queryStringParameters || {};

    // Verification / landing response (exact plain text the extension expects)
    if (!url) {
      return withHeaders(200, "Bandwidth Hero Data Compression Service");
    }

    // Normalize URL value (array / JSON / legacy Opera mini rewrite)
    let targetUrl = url;
    try { targetUrl = JSON.parse(url); } catch {}
    if (Array.isArray(targetUrl)) targetUrl = targetUrl.join("&url=");
    targetUrl = targetUrl.replace(
      /http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i,
      "http://"
    );

    // Params from extension
    const useWebp = !jpeg;
    const grayscale = bw == "1";
    const quality = parseInt(l, 10) || DEFAULT_QUALITY;

    // Fetch original image (Node 18 native fetch)
    const response = await fetch(targetUrl, {
      headers: {
        ...pick(event.headers, ["cookie", "dnt", "referer"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": event.headers?.["x-forwarded-for"] || event.ip,
        via: "1.1 bandwidth-hero",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      // Propagate status so the extension knows what happened
      return withHeaders(response.status, "Failed to fetch image");
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = response.headers.get("content-type") || "";
    const originalSize = buffer.length;

    // If we shouldn't compress, pass-through
    if (!shouldCompress(contentType, originalSize, useWebp)) {
      return withHeaders(
        200,
        buffer.toString("base64"),
        {
          "content-type": contentType || "application/octet-stream",
          "x-original-size": String(originalSize),
        },
        true // base64
      );
    }

    // Compress with Sharp
    const { err, output, headers } = await compress(
      buffer,
      useWebp,
      grayscale,
      quality,
      originalSize
    );

    if (err) {
      return withHeaders(500, "Compression failed");
    }

    // Return compressed image (base64)
    return {
      statusCode: 200,
      body: output.toString("base64"),
      isBase64Encoded: true,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,HEAD,OPTIONS",
        "content-encoding": "identity",
        ...headers, // includes correct image content-type + sizes
      },
    };
  } catch (e) {
    return withHeaders(500, `Error: ${e.message || "Internal Error"}`);
  }
};