const pick = require("../util/pick"),
  fetch = require("node-fetch"),
  shouldCompress = require("../util/shouldCompress"),
  compress = require("../util/compress"),
  DEFAULT_QUALITY = 40;

exports.handler = async (e, t) => {
  let { url: r } = e.queryStringParameters,
    { jpeg: s, bw: o, l: a } = e.queryStringParameters;

  if (!r)
    return { statusCode: 200, body: "Bandwidth Hero Data Compression Service" };

  try {
    r = JSON.parse(r) || r; // Handle JSON-encoded URLs
  } catch {}
  Array.isArray(r) && (r = r.join("&url=")),
    (r = r.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://"));

  let d = !s,
    n = o != 0,
    i = parseInt(a, 10) || DEFAULT_QUALITY;

  try {
    let h = {},
      attempt = 0,
      maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        let response = await fetch(r, {
          headers: {
            ...pick(e.headers, ["cookie", "dnt", "referer"]),
            "user-agent": "Bandwidth-Hero Compressor",
            "x-forwarded-for": e.headers["x-forwarded-for"] || e.ip,
            via: "1.1 bandwidth-hero",
          },
          agent: new (require("https").Agent)({
            rejectUnauthorized: true,
            secureProtocol: "TLSv1_2_method",
            checkServerIdentity: (host, cert) => {
              if (host !== new URL(r).hostname) {
                throw new Error(`Hostname mismatch: ${host} vs ${new URL(r).hostname}`);
              }
              return require("tls").checkServerIdentity(host, cert);
            },
          }),
          timeout: 10000,
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        let c = await response.buffer(),
          l = response.headers.get("content-type") || "";
        h = response.headers;
        let p = c.length;

        if (!l || l.includes("png")) l = "image/png";
        if (!shouldCompress(l, p, d))
          return {
            statusCode: 200,
            body: c.toString("base64"),
            isBase64Encoded: true,
            headers: { "content-type": l || "image/jpeg", "content-encoding": "identity", "Access-Control-Allow-Origin": "*", ...h },
          };

        let { err: u, output: y, headers: g } = await compress(c, d, n, i, p);
        if (u) throw (console.log("Conversion failed: ", r), u);

        console.log(`From ${p}, Saved: ${(p - y.length) / p}%`, "Content-Type:", g["content-type"]);
        let $ = y.toString("base64");
        return {
          statusCode: 200,
          body: $,
          isBase64Encoded: true,
          headers: { "content-type": g["content-type"] || "image/jpeg", "content-encoding": "identity", "Access-Control-Allow-Origin": "*", ...h, ...g },
        };
      } catch (f) {
        attempt++;
        if (attempt === maxAttempts) throw f;
        console.log(`Retry ${attempt} failed for ${r}:`, f.message);
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  } catch (f) {
    console.error("Error processing image:", f.message, "URL:", r);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to process image. Check URL or server logs." }) };
  }
};