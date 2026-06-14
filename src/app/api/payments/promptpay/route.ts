import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { omise } from "@/lib/omise";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { event_id, amount } = await req.json();
  if (!event_id || !amount) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Verify the event belongs to this planner
  const { data: ev } = await supabase.from("events").select("id, status, omise_charge_id").eq("id", event_id).single();
  if (!ev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (ev.status !== "draft") return NextResponse.json({ error: "already_active" }, { status: 400 });

  if (!process.env.OMISE_SECRET_KEY) {
    // Dev fallback when keys aren't wired yet — return the static stub QR.
    return NextResponse.json({ qr_image: "/assets/promptpay-qr.jpg", stub: true });
  }

  // Reuse an existing pending charge instead of minting a new one on every
  // page load — avoids orphaning the QR the guest may already be looking at.
  if (ev.omise_charge_id) {
    try {
      const existing = await omise().charges.retrieve(ev.omise_charge_id);
      if (existing.status === "pending") {
        const qrUrl = existing.source?.scannable_code?.image?.download_uri;
        return NextResponse.json({ charge_id: existing.id, qr_image: qrUrl || "/assets/promptpay-qr.jpg", expires_at: existing.expires_at });
      }
    } catch {
      // charge lookup failed — fall through and create a new one
    }
  }

  try {
    const source = await omise().sources.create({
      type: "promptpay",
      amount: amount * 100,         // Omise uses minor units (satang)
      currency: "thb",
    });
    const charge = await omise().charges.create({
      amount: amount * 100,
      currency: "thb",
      source: source.id,
      metadata: { event_id, account_id: user.id },
    });
    await supabase.from("events").update({ omise_charge_id: charge.id }).eq("id", event_id);

    const qrUrl = charge.source?.scannable_code?.image?.download_uri;
    return NextResponse.json({ charge_id: charge.id, qr_image: qrUrl || "/assets/promptpay-qr.jpg", expires_at: charge.expires_at });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "omise_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
