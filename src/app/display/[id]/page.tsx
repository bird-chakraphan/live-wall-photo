"use client";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { gradientText, IdleCard, LOGO_SIZE_PX, TestModeBanner, TestModeDiagonalOverlay } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { LogoSize, SubmissionRow } from "@/types/db";

type PublicEvent = {
  id: string; name: string;
  status: "active_ready" | "active_live";
  accent_color: string; display_font: string; post_duration_seconds: number;
  display_bg_url: string | null; logo_url: string | null; logo_size: LogoSize; paused: boolean;
};

// Submissions are eligible for display once approved_at is at least 60s old —
// the buffer is the moderation-recall window from the spec.
const BUFFER_SECONDS = 60;

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [posts, setPosts] = useState<SubmissionRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch event + initial submissions
  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.rpc("event_public", { p_id: id });
      const row = Array.isArray(ev) ? ev[0] : ev;
      if (row) setEvent(row as PublicEvent);
      await loadPosts();
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const loadPosts = async () => {
    const cutoff = new Date(Date.now() - BUFFER_SECONDS * 1000).toISOString();
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("event_id", id)
      .in("status", ["approved", "played"])
      .lte("approved_at", cutoff)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true });
    setPosts((data || []) as SubmissionRow[]);
  };

  // Realtime: re-load when anything changes, via broadcast pings sent by
  // DB triggers (see migration 009) — avoids RLS-on-new-row gating that
  // dropped the broadcast for status='skipped' submissions, and avoids
  // exposing the full events row to anon. Also used to broadcast which post
  // is now playing (see below), so the control panel's progress bar can stay
  // in sync (#14/#15).
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const postsRef = useRef<SubmissionRow[]>([]);
  const idxRef = useRef(0);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => {
    const channel = supabase
      .channel(`event-${id}`)
      .on("broadcast", { event: "submissions_changed" }, () => loadPosts())
      .on("broadcast", { event: "event_status_changed" }, ({ payload }) => {
        setEvent((prev) => (prev ? { ...prev, status: payload.status, paused: payload.paused } : prev));
      })
      .on("broadcast", { event: "jump_to_post" }, ({ payload }) => {
        const targetIdx = postsRef.current.findIndex((p) => p.id === payload.postId);
        if (targetIdx === -1 || targetIdx === idxRef.current) return;
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        setFade(false);
        setTimeout(() => {
          setIdx(targetIdx);
          setFade(true);
        }, 500);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const live = event?.status === "active_live";
  const isTestMode = event?.status === "active_ready";
  const currentPost = posts[idx];
  const duration = (event?.post_duration_seconds || 15) * 1000;
  const showLiveWall = live && currentPost && !event?.paused;

  // Auto-advance with fade
  useEffect(() => {
    if (!live || event?.paused || posts.length === 0) return;
    advanceTimer.current = setTimeout(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % posts.length);
        setFade(true);
      }, 500);
    }, duration);
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [idx, posts, live, event?.paused, duration]);

  // Let the control panel know which post just started (and for how long),
  // so its progress bar can reset/sync to the real timer instead of running
  // an independent guess. Fires on advance, and again on resume (the
  // auto-advance effect above restarts the full duration on resume too).
  useEffect(() => {
    if (!showLiveWall) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "now_playing",
      payload: { postId: currentPost.id, durationMs: duration },
    });
  }, [currentPost?.id, showLiveWall, duration]);

  // Reset if posts shrank below current idx
  useEffect(() => { if (idx >= posts.length) setIdx(0); }, [posts.length, idx]);

  const ac = event?.accent_color || "#FF7A59";
  const f = event?.display_font || "Prompt";

  if (!event) {
    return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", fontFamily: "var(--font-thai)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {isTestMode && <TestModeBanner />}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", containerType: "inline-size" }}>
        {showLiveWall ? (
          <>
            {posts.map((p, i) => (
              <div key={p.id} style={{
                position: "absolute", inset: 0,
                opacity: i === idx ? (fade ? 1 : 0) : 0,
                transition: "opacity .5s ease",
              }}>
                <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, rgba(0,0,0,.3) 15%, transparent 30%)" }} />
              </div>
            ))}
            {event.logo_url && (
              <div style={{ position: "absolute", top: 36, right: 36 }}>
                <img src={event.logo_url} alt="" style={{ height: LOGO_SIZE_PX[event.logo_size], maxWidth: 480, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))" }} />
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 60px 52px", opacity: fade ? 1 : 0, transition: "opacity .5s ease" }}>
              <div style={{
                fontSize: 80, fontWeight: 800, ...gradientText(ac),
                letterSpacing: "-.02em", marginBottom: 14, lineHeight: 1,
                ...(ac.includes("gradient")
                  ? { filter: "drop-shadow(0 2px 10px rgba(0,0,0,.45))" }
                  : { textShadow: "0 2px 10px rgba(0,0,0,.45)" }),
              }}>
                {currentPost.guest_name}
              </div>
              <div style={{ fontSize: 42, fontWeight: 400, color: "rgba(255,255,255,.92)", maxWidth: "65%", lineHeight: 1.4, textShadow: "0 1px 10px rgba(0,0,0,.5)" }}>
                {currentPost.message}
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 22, right: 28, display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.45)", fontSize: 15, fontWeight: 700, fontFamily: "var(--font-ui)" }}>
              <img src="/assets/sparkle-mint.svg" alt="" style={{ width: 16, height: 16, opacity: 0.55, filter: "brightness(0) invert(1)" }} />
              WeddingTech
            </div>
            <div style={{ position: "absolute", bottom: 22, left: 60, color: "rgba(255,255,255,.4)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)" }}>
              {idx + 1} / {posts.length}
            </div>
          </>
        ) : (
          <IdleCard accent={ac} font={f} bg={event.display_bg_url} eventName={event.name} eventId={id} />
        )}

        {isTestMode && <TestModeDiagonalOverlay />}
      </div>
    </div>
  );
}
