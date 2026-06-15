import { NextResponse } from "next/server";
import { storagePathFromUrl } from "@/lib/storage-path";
import { createServiceClient } from "@/lib/supabase/server";

// Daily retention purge (see supabase/migrations/010_retention.sql). For
// each event past its retention_until with content not yet purged, deletes
// its submissions' Storage objects + rows and marks the event
// content_purged_at. The event row itself is kept for planner history.
//
// Pass ?dry_run=1 to log what would be purged without deleting anything.
export async function GET(req: Request) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";
  const svc = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: events, error } = await svc
    .from("events")
    .select("id, name, retention_until")
    .lte("retention_until", today)
    .is("content_purged_at", null);
  if (error) return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });

  const results: { eventId: string; name: string; submissions: number; status: string }[] = [];

  for (const ev of events || []) {
    const { data: subs, error: subsErr } = await svc.from("submissions").select("id, photo_url").eq("event_id", ev.id);
    if (subsErr) {
      results.push({ eventId: ev.id, name: ev.name, submissions: 0, status: `error: ${subsErr.message}` });
      continue;
    }

    const paths = (subs || [])
      .map((s: { photo_url: string }) => storagePathFromUrl(s.photo_url))
      .filter((p: string | null): p is string => !!p);

    if (dryRun) {
      results.push({ eventId: ev.id, name: ev.name, submissions: subs?.length || 0, status: "dry_run" });
      continue;
    }

    if (paths.length) {
      const { error: rmErr } = await svc.storage.from("guest-photos").remove(paths);
      if (rmErr) {
        results.push({ eventId: ev.id, name: ev.name, submissions: subs?.length || 0, status: `storage_error: ${rmErr.message}` });
        continue;
      }
    }

    const { error: delErr } = await svc.from("submissions").delete().eq("event_id", ev.id);
    if (delErr) {
      results.push({ eventId: ev.id, name: ev.name, submissions: subs?.length || 0, status: `delete_error: ${delErr.message}` });
      continue;
    }

    await svc.from("events").update({ content_purged_at: new Date().toISOString() }).eq("id", ev.id);
    results.push({ eventId: ev.id, name: ev.name, submissions: subs?.length || 0, status: "purged" });
  }

  console.log(`retention: ${dryRun ? "[dry run] " : ""}${results.length} event(s) processed`, JSON.stringify(results));
  return NextResponse.json({ ok: true, dryRun, processed: results });
}
