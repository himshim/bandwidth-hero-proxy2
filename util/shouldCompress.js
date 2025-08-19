// Decide if we should compress based on content-type and size.
// Simplified + more aggressive.

// Minimum sizes (bytes)
const MIN_LEN = 512;          // for most images
const MIN_PNG_GIF_LEN = 4096; // PNG/GIF often compress poorly at tiny sizes

function shouldCompress(contentType, size) {
  if (!contentType || !contentType.startsWith("image")) return false;
  if (!size || size <= 0) return false;

  const isPngOrGif = /image\/(png|gif)/i.test(contentType);

  if (isPngOrGif) return size >= MIN_PNG_GIF_LEN;

  return size >= MIN_LEN;
}

module.exports = shouldCompress;