const sharp = require('sharp');
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10min cache

exports.handler = async (event, context) => {
  try {
    const { url, quality = 50, grayscale = 'false', format = 'webp' } = event.queryStringParameters;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image URL parameter' })
      };
    }

    // Check cache
    const cacheKey = `${url}_${quality}_${grayscale}_${format}`;
    const cachedImage = cache.get(cacheKey);
    if (cachedImage) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': `image/${format}` },
        body: cachedImage,
        isBase64Encoded: true
      };
    }

    // Fetch image
    const response = await axios.get(url, {
      headers: event.headers, // Pass user headers for auth
      responseType: 'arraybuffer'
    });

    // Process image
    let image = sharp(response.data);
    if (grayscale === 'true') image = image.grayscale();
    image = image.toFormat(format, { quality: parseInt(quality) });

    const output = await image.toBuffer();
    const base64Output = output.toString('base64');

    // Cache result
    cache.set(cacheKey, base64Output);

    return {
      statusCode: 200,
      headers: { 'Content-Type': `image/${format}` },
      body: base64Output,
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process image. Check URL or server logs.' })
    };
  }
};