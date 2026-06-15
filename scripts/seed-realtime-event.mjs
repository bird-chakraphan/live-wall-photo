// Seeds (or reuses) an `active_live` event with one display-eligible
// submission, plus known login credentials, for the realtime-sync e2e test.
// Run with: node --env-file=.env.local scripts/seed-realtime-event.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const TEST_EMAIL = "e2e-realtime@weddingtech.test";
const TEST_PASSWORD = "E2E-Realtime-Test-Pw1";

async function getOrCreateTestUser() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { password: TEST_PASSWORD });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const accountId = await getOrCreateTestUser();

  let { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("account_id", accountId)
    .eq("status", "active_live")
    .limit(1)
    .maybeSingle();

  if (!event) {
    const { data, error } = await supabase
      .from("events")
      .insert({ account_id: accountId, name: "E2E Realtime Test Event", status: "active_live" })
      .select("id")
      .single();
    if (error) throw error;
    event = data;
  }

  // Reset to a known, unpaused state in case a previous run left it paused.
  await supabase.from("events").update({ paused: false }).eq("id", event.id);

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();

  if (!existingSubmission) {
    const approvedAt = new Date(Date.now() - 120 * 1000).toISOString();
    const { error } = await supabase.from("submissions").insert({
      event_id: event.id,
      guest_name: "Realtime Tester",
      message: "Testing realtime sync",
      photo_url: "https://placehold.co/600x800.png",
      status: "approved",
      approved_at: approvedAt,
    });
    if (error) throw error;
  }

  console.log(JSON.stringify({ eventId: event.id, email: TEST_EMAIL, password: TEST_PASSWORD }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
