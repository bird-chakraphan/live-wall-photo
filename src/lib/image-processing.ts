import sharp from "sharp";

// Long-edge cap for stored photos — keeps the wall display crisp while
// meaningfully reducing storage for typical 12+ MP phone photos.
export const MAX_DIMENSION_PX = 2560;

// Auto-orients from EXIF, strips all metadata (GPS/device info), downscales
// oversized photos, and normalizes to JPEG. Throws if the input format can't
// be decoded (e.g. HEIC on builds without HEIC support).
export async function processSubmissionPhoto(srcBuf: Buffer): Promise<Buffer> {
  return sharp(srcBuf)
    .rotate()
    .resize({ width: MAX_DIMENSION_PX, height: MAX_DIMENSION_PX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}
