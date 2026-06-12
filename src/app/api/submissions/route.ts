import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { moderateImage, moderateText } from "@/lib/moderation";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const eventId = String(form.get("event_id") || "");
  const guestName = String(form.get("guest_name") || "").trim().slice(0, 40);
  const message = String(form.get("message") || "").trim().slice(0, 150);
  const photo = form.get("photo");

  if (!eventId || !guestName || !message || !(photo instanceof File)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "photo_too_large" }, { status: 413 });
  }

  const svc = createServiceClient();

  // Verify event is open for submissions (active_ready or active_live).
  const { data: ev } = await svc.from("events").select("id, status").eq("id", eventId).single();
  if (!ev || (ev.status !== "active_ready" && ev.status !== "active_live")) {
    return NextResponse.json({ error: "event_not_open" }, { status: 404 });
  }

  // Upload to Storage
  const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(await photo.arrayBuffer());
  const { error: upErr } = await svc.storage.from("guest-photos").upload(path, buf, {
    contentType: photo.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: "upload_failed", detail: upErr.message }, { status: 500 });
  const { data: pub } = svc.storage.from("guest-photos").getPublicUrl(path);
  const photo_url = pub.publicUrl;

  // Moderate text + image in parallel
  const [textCheck, imgCheck] = await Promise.all([moderateText(`${guestName}\n${message}`), moderateImage(photo_url)]);
  const ok = textCheck.ok && imgCheck.ok;
  const reason = ok ? null : `${textCheck.reason || ""}|${imgCheck.reason || ""}`;

  // Insert as pending if rejected, approved (with 60s buffer at display read time) otherwise
  const { error: insErr } = await svc.from("submissions").insert({
    event_id: eventId,
    guest_name: guestName,
    message,
    photo_url,
    status: ok ? "approved" : "rejected",
    approved_at: ok ? new Date().toISOString() : null,
    moderation_reason: reason,
  });
  if (insErr) return NextResponse.json({ error: "insert_failed", detail: insErr.message }, { status: 500 });

  // Silent rejection: always return 200 — guests never learn their submission was rejected.
  return NextResponse.json({ ok: true });
}
