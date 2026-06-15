import { describe, expect, it } from "vitest";
import { storagePathFromUrl } from "./storage-path";

describe("storagePathFromUrl", () => {
  it("extracts the object path from a public guest-photos URL", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/guest-photos/event-1/abc.jpg";
    expect(storagePathFromUrl(url)).toBe("event-1/abc.jpg");
  });

  it("returns null for URLs without a guest-photos segment", () => {
    expect(storagePathFromUrl("https://example.com/foo.jpg")).toBeNull();
  });
});
