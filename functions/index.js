const pick = require("../util/pick")
const fetch = require("node-fetch");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

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
        if (!res.ok){
            return {
                statusCode: res.status ?? 302
            }
        }

        return {
            data: await res.text(),
            type: res.headers.get("content-type") || ""
        }
    })

    const originSize = data.length;
    console.log({originType, originSize});

    if (shouldCompress(originType, originSize, webp)) {
        const {err, output, headers} = await compress(data, webp, grayscale, quality, originSize);   // compress

        if(err) {
            console.log("Conversion failed: ", url);
            return {
                statusCode: 500,
                body: err.message ?? ""
            }
        }

        console.log(`Compressed from ${originSize}, to ${output.length}`);
        return {
            statusCode: 200,
            body: output,
            headers: {
                "content-encoding": "identity",
                ...event.headers,
                ...headers
            }
        }
    } else {
        console.log("Bypassing request...");
        return {    // bypass
            statusCode: 200,
            body: data,
            headers: {
                "x-proxy-bypass": '1',
                "content-length": data.length
            }
        }
    }
}
