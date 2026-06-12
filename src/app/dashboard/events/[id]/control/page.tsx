"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { gradientText, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, SubmissionRow } from "@/types/db";

const D = { bg: "#0C0C0C", surface: "#161616", card: "#1E1E1E", border: "rgba(255,255,255,.08)", text: "#FFFFFF", muted: "rgba(255,255,255,.55)", faint: "rgba(255,255,255,.28)" };

export default function ControlPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [queue, setQueue] = useState<SubmissionRow[]>([]);
  const [pct, setPct] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load + subscribe
  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(ev as EventRow);
      await reload();
    })();
    const ch = supabase
      .channel(`ctrl-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${id}` }, () => reload())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${id}` },
        async () => {
          const { data: ev } = await supabase.from("events").select("*").eq("id", id).single();
          setEvent(ev as EventRow);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const reload = async () => {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("event_id", id)
      .in("status", ["approved", "played"])
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true });
    setQueue((data || []) as SubmissionRow[]);
  };

  // Progress bar animation
  useEffect(() => {
    if (event?.paused) return;
    const dur = (event?.post_duration_seconds || 15) * 1000;
    const interval = 75;
    const inc = (100 / dur) * interval;
    const t = setInterval(() => setPct((p) => (p >= 100 ? 0 : p + inc)), interval);
    return () => clearInterval(t);
  }, [event?.paused, event?.post_duration_seconds]);

  const nowPlaying = queue[0];
  const upNext = queue.slice(1);
  const ac = event?.accent_color || "#FF7A59";

  const togglePause = async () => {
    if (!event) return;
    await supabase.from("events").update({ paused: !event.paused }).eq("id", event.id);
  };
  const skipNow = async () => {
    if (!nowPlaying) return;
    await supabase.from("submissions").update({ status: "skipped" }).eq("id", nowPlaying.id);
  };
  const skipItem = async (subId: string) => {
    await supabase.from("submissions").update({ status: "skipped" }).eq("id", subId);
  };
  const pinItem = async (subId: string) => {
    await supabase.from("submissions").update({ pinned: true }).eq("id", subId);
  };

  if (!event) {
    return <div style={{ minHeight: "100vh", background: D.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner color="#fff" /></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: D.bg, fontFamily: "var(--font-ui)", color: D.text, display: "flex", flexDirection: "column", maxWidth: 420, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid " + D.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href={`/dashboard/events/${id}`} style={{ fontSize: 13, color: D.muted }}>← Settings</Link>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{event.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: event.paused ? "#D97706" : ac, animation: event.paused ? "none" : "pulse 2s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, ...(event.paused ? { color: "#D97706" } : gradientText(ac)) }}>{event.paused ? "PAUSED" : "LIVE"}</span>
        </div>
      </div>

      {/* Now Playing */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid " + D.border }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: D.faint, marginBottom: 12 }}>Now Playing</div>
        {nowPlaying ? (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "#222" }}>
                <img src={nowPlaying.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{nowPlaying.guest_name}</div>
                <div style={{ fontSize: 13, color: D.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>&ldquo;{nowPlaying.message}&rdquo;</div>
              </div>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,.10)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: event.paused ? "rgba(255,255,255,.2)" : ac, transition: "width .075s linear" }} />
            </div>
            <button onClick={skipNow} style={{ width: "100%", marginTop: 12, height: 48, border: "1px solid " + D.border, borderRadius: 12, background: "rgba(255,255,255,.06)", color: D.text, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Skip ⏭</button>
          </>
        ) : (
          <div style={{ padding: "20px 0", textAlign: "center", color: D.faint, fontSize: 14 }}>Queue is empty — display will show the idle screen.</div>
        )}
      </div>

      {/* Up Next */}
      <div style={{ flex: 1, padding: "14px 18px 8px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: D.faint }}>Up Next</span>
          <span style={{ background: "rgba(255,255,255,.10)", color: D.muted, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{upNext.length}</span>
        </div>
        {upNext.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: D.faint, fontSize: 14, fontStyle: "italic" }}>No more posts in queue</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upNext.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, background: D.card, borderRadius: 14, padding: "10px 12px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#222" }}>
                  <img src={item.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.guest_name}{item.pinned && <span style={{ marginLeft: 6, fontSize: 11, color: D.muted }}>📌</span>}</div>
                  <div style={{ fontSize: 12, color: D.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.message}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!item.pinned && (
                    <button onClick={() => pinItem(item.id)} title="Pin next" style={{ background: "rgba(255,255,255,.06)", border: 0, borderRadius: 8, height: 34, padding: "0 10px", color: D.text, fontSize: 13, cursor: "pointer" }}>📌</button>
                  )}
                  <button onClick={() => setDeleteConfirm(item.id)} title="Skip" style={{ background: "rgba(220,38,38,.15)", border: 0, borderRadius: 8, height: 34, padding: "0 12px", color: D.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Skip ⏭</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "14px 18px 28px", borderTop: "1px solid " + D.border, display: "flex", gap: 10 }}>
        <button onClick={togglePause} style={{ flex: 1, height: 56, border: "1px solid " + D.border, borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 700, background: event.paused ? ac : D.card, color: event.paused ? "#fff" : D.text }}>
          {event.paused ? "▶ Resume" : "Pause ⏸"}
        </button>
      </div>

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,.5)" }} onClick={() => setDeleteConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: D.surface, borderRadius: 16, padding: "24px 28px", maxWidth: 320, boxShadow: "var(--shadow-float)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Skip this post?</div>
            <div style={{ fontSize: 13, color: D.muted, marginBottom: 20, lineHeight: 1.6 }}>This will remove the post from the queue. It cannot be undone.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: D.card, color: D.text, border: "1px solid " + D.border, borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { skipItem(deleteConfirm); setDeleteConfirm(null); }} style={{ background: "#DC2626", color: "#fff", border: 0, borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Skip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
