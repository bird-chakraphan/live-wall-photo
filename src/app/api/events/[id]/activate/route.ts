import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Marks an event as active_ready. In production this would only run after a
// successful Omise webhook — for now we trust the planner-initiated client call
// (RLS still scopes it to events they own).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
