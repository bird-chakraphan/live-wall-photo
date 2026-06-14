import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moderateImage, moderateText } from "./moderation";

describe("moderateText", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("auto-approves when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(moderateText("anything")).resolves.toEqual({ ok: true });
  });
});

describe("moderateImage", () => {
  const originalUser = process.env.SIGHTENGINE_USER;
  const originalSecret = process.env.SIGHTENGINE_SECRET;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.SIGHTENGINE_USER = originalUser;
    process.env.SIGHTENGINE_SECRET = originalSecret;
  });

  it("auto-approves when Sightengine keys are not set", async () => {
    delete process.env.SIGHTENGINE_USER;
    delete process.env.SIGHTENGINE_SECRET;
    await expect(moderateImage("https://example.com/photo.jpg")).resolves.toEqual({ ok: true });
  });

  it("rejects images flagged above the threshold", async () => {
    process.env.SIGHTENGINE_USER = "user";
    process.env.SIGHTENGINE_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        status: "success",
        nudity: { sexual_activity: 0.9 },
        weapon: { classes: { firearm: 0 } },
        gore: { prob: 0 },
        offensive: { prob: 0 },
      }),
    }));
    const result = await moderateImage("https://example.com/photo.jpg");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("nudity=0.9");
  });

  it("accepts images below the threshold", async () => {
    process.env.SIGHTENGINE_USER = "user";
    process.env.SIGHTENGINE_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        status: "success",
        nudity: { sexual_activity: 0.01 },
        weapon: { classes: { firearm: 0 } },
        gore: { prob: 0 },
        offensive: { prob: 0 },
      }),
    }));
    await expect(moderateImage("https://example.com/photo.jpg")).resolves.toEqual({ ok: true });
  });
});
