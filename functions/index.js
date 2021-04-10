const pick = require("../util/pick")

const DEFAULT_QUALITY = 40;

exports.handler = async (event, context) => {
    let { url } = event.queryStringParameters;

    try{
        url = JSON.parse(url);  // if simple string, then will remain so 
    } catch {}

    if (Array.isArray()) {
        url = 
    }

    return {
        statusCode: 200,
        body: "bandwidth-hero-proxy"
    };
}
