"use client";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { gradientText, TestModeBanner, TestModeDiagonalOverlay } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { SubmissionRow } from "@/types/db";

type PublicEvent = {
  id: string; name: string;
  status: "active_ready" | "active_live";
  accent_color: string; display_font: string; post_duration_seconds: number;
  display_bg_url: string | null; logo_url: string | null; paused: boolean;
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

  // Realtime: re-load when anything changes
  useEffect(() => {
    const channel = supabase
      .channel(`event-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${id}` },
        () => loadPosts())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${id}` },
        async () => {
          const { data: ev } = await supabase.rpc("event_public", { p_id: id });
          const row = Array.isArray(ev) ? ev[0] : ev;
          if (row) setEvent(row as PublicEvent);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const live = event?.status === "active_live";
  const isTestMode = event?.status === "active_ready";
  const currentPost = posts[idx];
  const duration = (event?.post_duration_seconds || 15) * 1000;

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

  // Reset if posts shrank below current idx
  useEffect(() => { if (idx >= posts.length) setIdx(0); }, [posts.length, idx]);

  const showLiveWall = live && currentPost && !event?.paused;
  const ac = event?.accent_color || "#FF7A59";
  const f = event?.display_font || "Prompt";

  if (!event) {
    return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", fontFamily: "var(--font-thai)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {isTestMode && <TestModeBanner />}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        {showLiveWall ? (
          <>
            {posts.map((p, i) => (
              <div key={p.id} style={{
                position: "absolute", inset: 0,
                opacity: i === idx ? (fade ? 1 : 0) : 0,
                transition: "opacity .5s ease",
              }}>
                <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.3) 45%, transparent 70%)" }} />
              </div>
            ))}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 60px 52px", opacity: fade ? 1 : 0, transition: "opacity .5s ease" }}>
              <div style={{
                fontSize: 64, fontWeight: 800, ...gradientText(ac),
                letterSpacing: "-.02em", marginBottom: 14, lineHeight: 1,
                ...(!ac.includes("gradient") && { textShadow: "0 2px 16px rgba(0,0,0,.35)" }),
              }}>
                {currentPost.guest_name}
              </div>
              <div style={{ fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,.92)", maxWidth: "65%", lineHeight: 1.4, textShadow: "0 1px 8px rgba(0,0,0,.4)" }}>
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

function IdleCard({ accent, font, bg, eventName, eventId }: { accent: string; font: string; bg: string | null; eventName: string; eventId: string }) {
  const guestUrl = typeof window !== "undefined" ? `${location.origin}/upload/${eventId}` : "";
  // QR code generated client-side via a free QR API.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}`;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", background: "#111" }}>
      <div style={{ position: "relative", width: "62%", overflow: "hidden" }}>
        <img src={bg || "/photos/couple-idle.jpg"} alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenBurns 24s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, background: "linear-gradient(to right, transparent, #F2F1EF)", width: 221 }} />
      </div>
      <div style={{ flex: 1, background: "#F2F1EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "52px 52px 44px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: 46, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, ...gradientText(accent) }}>
            {eventName}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ fontFamily: font, color: "var(--ink)", fontSize: 21 }}>สแกนเพื่อแชร์ช่วงเวลาของคุณ</div>
          <div style={{ width: 244, height: 244, background: accent, borderRadius: 22, padding: 2.5, boxShadow: "0 16px 48px rgba(0,0,0,.10)" }}>
            <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 19.5, padding: 18, boxSizing: "border-box" }}>
              <img src={qrSrc} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, background: "#fff", borderRadius: 16, border: "1px solid var(--line-soft)", overflow: "hidden", width: "100%" }}>
          {[{ n: "1", t: "สแกน QR" }, { n: "2", t: "เลือกรูป" }, { n: "3", t: "ขึ้นจอใหญ่" }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "16px 12px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--line-soft)" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: "#fff", fontSize: 12, fontWeight: 800 }}>{s.n}</div>
              <div style={{ fontFamily: font, fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{s.t}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <img src="/assets/sparkle-mint.svg" alt="" style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)" }}>WeddingTech</span>
        </div>
      </div>
    </div>
  );
}
