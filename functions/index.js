const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = process.env.DEFAULT_QUALITY || 40;

// Main Netlify Function
exports.handler = async (event) => {
  try {
    // Health check + extension verification
    const { url, jpeg, bw, l } = event.queryStringParameters || {};
    if (!url) {
      return {
        statusCode: 200,
        headers: { "content-type": "text/plain" }, // 👈 force plain text
        body: "Bandwidth Hero Data Compression Service"
      };
    }

    // If URL is array or JSON, normalize it
    let targetUrl = url;
    try { targetUrl = JSON.parse(url); } catch {}
    if (Array.isArray(targetUrl)) targetUrl = targetUrl.join("&url=");
    targetUrl = targetUrl.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

    // Params
    const useWebp = !jpeg;
    const grayscale = bw == "1";
    const quality = parseInt(l, 10) || DEFAULT_QUALITY;

    // Fetch original image (Node 18 has native fetch)
    const response = await fetch(targetUrl, {
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
        headers: {
          "content-encoding": "identity",
          "content-type": contentType
        },
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