const MIN_COMPRESS_LENGTH = 1024;
const MIN_TRANSPARENT_COMPRESS_LENGTH = 102400;

function shouldCompress(imageType, size, isTransparent) {
  return !(
    !imageType.startsWith("image") ||
    size === 0 ||
    (isTransparent && size < MIN_COMPRESS_LENGTH) ||
    (!isTransparent && (imageType.endsWith("png") || imageType.endsWith("gif")) && size < MIN_TRANSPARENT_COMPRESS_LENGTH)
  );
}

module.exports = shouldCompress;