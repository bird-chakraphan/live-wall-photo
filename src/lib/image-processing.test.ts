import fs from "fs";
import path from "path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processSubmissionPhoto } from "./image-processing";

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, "..", "..", "e2e", "fixtures", name));

describe("processSubmissionPhoto", () => {
  it("re-encodes to JPEG with no EXIF metadata", async () => {
    const out = await processSubmissionPhoto(fixture("photo.jpg"));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
  });

  it("auto-rotates based on EXIF orientation", async () => {
    const out = await processSubmissionPhoto(fixture("photo-rotated.jpg"));
    const meta = await sharp(out).metadata();
    // Source is 400x300 tagged orientation=6 (rotate 90deg) — upright output is 300x400.
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(400);
    expect(meta.orientation).toBeUndefined();
  });

  it("downscales photos larger than the max dimension", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 20, b: 30 } } })
      .jpeg()
      .toBuffer();
    const out = await processSubmissionPhoto(big);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBeLessThanOrEqual(2560);
    expect(meta.height).toBeLessThanOrEqual(2560);
  });

  it("rejects formats it cannot decode", async () => {
    await expect(processSubmissionPhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});
