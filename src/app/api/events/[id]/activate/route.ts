import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dev-only stub: marks an event as active_ready without a real payment.
// In production this is done by /api/webhooks/omise after the Omise charge
// confirms — this route is gated to when OMISE_SECRET_KEY isn't configured.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (process.env.OMISE_SECRET_KEY) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("events")
    .update({ status: "active_ready", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
