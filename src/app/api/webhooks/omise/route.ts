import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { omise } from "@/lib/omise";

// Omise webhook — receives `charge.complete` (and other) events.
// We never trust the payload's status: re-fetch the charge by id from Omise
// using our secret key, then flip the matching event to active_ready only
// if the charge is actually successful.
export async function POST(req: Request) {
  let body: { key?: string; data?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const chargeId = body?.data?.id;
  if (!chargeId) return NextResponse.json({ ok: true });

  let charge;
  try {
    charge = await omise().charges.retrieve(chargeId);
  } catch {
    return NextResponse.json({ error: "omise_lookup_failed" }, { status: 502 });
  }

  if (charge.status !== "successful") return NextResponse.json({ ok: true });

  const svc = createServiceClient();
  const { data: ev } = await svc.from("events").select("id, status").eq("omise_charge_id", chargeId).single();
  if (!ev || ev.status !== "draft") return NextResponse.json({ ok: true });

  await svc.from("events").update({ status: "active_ready", paid_at: new Date().toISOString() }).eq("id", ev.id);

  return NextResponse.json({ ok: true });
}
