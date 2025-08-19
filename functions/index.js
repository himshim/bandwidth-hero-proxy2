const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = process.env.DEFAULT_QUALITY || 40;

// Main Netlify Function
exports.handler = async (event) => {
  try {
    // Health check endpoint
    if (event.path === "/api/health") {
      return { statusCode: 200, body: "OK" };
    }

    // Get query params
    let { url, jpeg, bw, l } = event.queryStringParameters || {};
    if (!url) {
      return { statusCode: 200, body: "Bandwidth Hero Data Compression Service" };
    }

    // If URL is array or JSON, normalize it
    try { url = JSON.parse(url); } catch {}
    if (Array.isArray(url)) url = url.join("&url=");
    url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

    // Params
    const useWebp = !jpeg;
    const grayscale = bw == "1";
    const quality = parseInt(l, 10) || DEFAULT_QUALITY;

    // Fetch original image (use built-in fetch from Node 18)
    const response = await fetch(url, {
      headers: {
        ...pick(event.headers, ["cookie", "dnt", "referer"]),
        "user-agent": "Bandwidth-Hero Compressor",
        "x-forwarded-for": event.headers["x-forwarded-for"] || event.ip,
        via: "1.1 bandwidth-hero",
      },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: "Failed to fetch image" };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    const originalSize = buffer.length;

    // Skip compression if not needed
    if (!shouldCompress(contentType, originalSize, useWebp)) {
      return {
        statusCode: 200,
        body: buffer.toString("base64"),
        isBase64Encoded: true,
        headers: { "content-encoding": "identity", "content-type": contentType },
      };
    }

    // Compress
    const { err, output, headers } = await compress(
      buffer, useWebp, grayscale, quality, originalSize
    );

    if (err) {
      return { statusCode: 500, body: JSON.stringify({ error: "Compression failed" }) };
    }

    return {
      statusCode: 200,
      body: output.toString("base64"),
      isBase64Encoded: true,
      headers: { "content-encoding": "identity", ...headers },
    };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};