// Seeds (or reuses) an `active_ready` event for the Playwright smoke test.
// Run with: node --env-file=.env.local scripts/seed-test-event.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const TEST_EMAIL = "e2e-test@weddingtech.test";

async function getOrCreateTestUser() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === TEST_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const accountId = await getOrCreateTestUser();

  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("account_id", accountId)
    .eq("status", "active_ready")
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(existing.id);
    return;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      account_id: accountId,
      name: "E2E Test Event",
      status: "active_ready",
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(data.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
