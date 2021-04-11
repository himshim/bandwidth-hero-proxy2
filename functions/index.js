const pick = require("../util/pick");
const fetch = require("node-fetch");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");
const fs = require("fs");

const DEFAULT_QUALITY = 40;

exports.handler = async (event, context) => {
    let { url } = event.queryStringParameters;
    const { jpeg, bw, l } = event.queryStringParameters;

    if (!url) {
        return {
            statusCode: 200,
            body: "bandwidth-hero-proxy"
        };
    }

    try {
        url = JSON.parse(url);  // if simple string, then will remain so 
    } catch { }

    if (Array.isArray(url)) {
        url = url.join("&url=");
    }

    // by now, url is a string
    url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

    const webp = !jpeg;
    const grayscale = bw != 0;
    const quality = parseInt(l, 10) || DEFAULT_QUALITY;

    console.log("Fetching...", url);
    try {
        let response_headers = {};
        const { data, type: originType } = await fetch(url, {
            headers: {
                ...pick(event.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': 'Bandwidth-Hero Compressor',
                'x-forwarded-for': event.headers['x-forwarded-for'] || event.ip,
                via: '1.1 bandwidth-hero'
            }
            // timeout: 10000,
            // maxRedirects: 5,
            // encoding: null,
            // strictSSL: false,
            // gzip: true,
            // jar: true
        }).then(async res => {
            if (!res.ok) {
                return {
                    statusCode: res.status || 302
                }
            }

            response_headers = res.headers;
            return {
                data: await res.buffer(),
                type: res.headers.get("content-type") || ""
            }
        })

        // console.log( data.length, escape(data).toString().length );
        // fs.writeFileSync("temp.png", data);
        // fs.writeFileSync("temp_string.png", '' + data);

        const originSize = data.length;
        console.log({ originType, originSize });

        if (shouldCompress(originType, originSize, webp)) {
            const { err, output, headers } = await compress(data, webp, grayscale, quality, originSize);   // compress

            if (err) {
                console.log("Conversion failed: ", url);
                throw err;
            }

            console.log(`Compressed from ${originSize}, to ${output.length}`);
            // fs.writeFileSync("compressed.webp", output)
            // fs.writeFileSync("compressed_str.webp", output.toString())
            return {
                statusCode: 200,
                body: output.toString(),
                headers: {
                    "content-encoding": "identity",
                    ...response_headers,
                    ...headers
                }
            }
        } else {
            console.log("Bypassing request... Size: " , data.length);
            console.log({
                "content-encoding": "identity",
                // "x-proxy-bypass": '1',
                ...response_headers,
            });
            return {    // bypass
                statusCode: 200,
                body: data.toString(),
                headers: {
                    "content-encoding": "identity",
                    // "x-proxy-bypass": '1',
                    ...response_headers,
                }
            }
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: err.message || ""
        }
    }
}
