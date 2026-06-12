// Moderation: OpenAI for text + Sightengine for images.
// Both calls are best-effort — if the keys aren't configured, we accept by default
// in dev. In production, missing keys should fail closed.

export async function moderateText(text: string): Promise<{ ok: boolean; reason?: string }> {
  if (!process.env.OPENAI_API_KEY) return { ok: true };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai").default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });
    const r = res.results?.[0];
    if (r?.flagged) {
      const reasons = Object.entries(r.categories || {})
        .filter(([, v]) => v).map(([k]) => k).join(",");
      return { ok: false, reason: `text:${reasons}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `text_error:${(e as Error).message}` };
  }
}

export async function moderateImage(imageUrl: string): Promise<{ ok: boolean; reason?: string }> {
  if (!process.env.SIGHTENGINE_USER || !process.env.SIGHTENGINE_SECRET) return { ok: true };
  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "nudity-2.1,weapon,offensive,gore-2.0",
      api_user: process.env.SIGHTENGINE_USER,
      api_secret: process.env.SIGHTENGINE_SECRET,
    });
    const res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
    const j = await res.json();
    if (j.status !== "success") return { ok: false, reason: `image_error:${j.error?.message}` };
    const nudity = j.nudity?.sexual_activity ?? 0;
    const weapon = j.weapon?.classes?.firearm ?? 0;
    const gore = j.gore?.prob ?? 0;
    const offensive = j.offensive?.prob ?? 0;
    if (nudity > 0.6 || weapon > 0.6 || gore > 0.6 || offensive > 0.6) {
      return { ok: false, reason: `image:nudity=${nudity} weapon=${weapon} gore=${gore} offensive=${offensive}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `image_error:${(e as Error).message}` };
  }
}
