const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = process.env.DEFAULT_QUALITY || 40;

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

    // ✅ Bandwidth Hero expects this exact string
    if (!url) {
      return respond(200, "bandwidth-hero-proxy", {
        contentType: "text/plain"
      });
    }

    let targetUrl = url;
    try { targetUrl = JSON.parse(url); } catch {}
    if (Array.isArray(targetUrl)) targetUrl = targetUrl.join("&url=");
    targetUrl = targetUrl.replace(
      /http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i,
      "http://"
    );

    const useWebp   = !jpeg;
    const grayscale = bw == "1";
    const quality   = parseInt(l, 10) || DEFAULT_QUALITY;

    const response = await fetch(targetUrl, {
      headers: {
        ...pick(event.headers || {}, ["cookie", "dnt", "referer"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": (event.headers && event.headers["x-forwarded-for"]) || event.ip,
        via: "1.1 bandwidth-hero",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return respond(response.status, "Failed to fetch image");
    }

    const arrayBuf    = await response.arrayBuffer();
    const sourceBuf   = Buffer.from(arrayBuf);
    const contentType = response.headers.get("content-type") || "";
    const originalLen = sourceBuf.length;

    if (!shouldCompress(contentType, originalLen, useWebp)) {
      return respond(
        200,
        sourceBuf.toString("base64"),
        {
          contentType: contentType || "application/octet-stream",
          isBase64Encoded: true,
          extraHeaders: {
            "x-original-size": String(originalLen)
          }
        }
      );
    }

    const { err, output, headers } = await compress(
      sourceBuf,
      useWebp,
      grayscale,
      quality,
      originalLen
    );

    if (err) {
      return respond(500, "Compression failed");
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
        ...headers,
      }
    };
  } catch (e) {
    return respond(500, `Error: ${e.message || "Internal Error"}`);
  }
};