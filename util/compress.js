const sharp = require("sharp");

function compress(input, useWebp, grayscale, quality, originalSize, maxWidth) {
  const format = useWebp ? "webp" : "jpeg";

  let pipeline = sharp(input);

  if (maxWidth > 0) {
    pipeline = pipeline.resize({
      width:              maxWidth,
      withoutEnlargement: true,
      fit:                "inside",
    });
  }

  // progressive + optimizeScans require a multi-pass encode — removed.
  // For a proxy that returns the full image in one response, baseline encoding
  // is faster with no quality difference perceived by the end user.
  return pipeline
    .grayscale(grayscale)
    .toFormat(format, { quality })
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => ({
      err: null,
      headers: {
        "content-type":    `image/${format}`,
        "content-length":  info.size,
        "x-original-size": originalSize,
        "x-bytes-saved":   originalSize - info.size,
      },
      output: data,
    }))
    .catch((err) => ({ err }));
}

module.exports = compress;