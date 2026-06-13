"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, PlannerLayout, useIsMobile, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, EventStatus } from "@/types/db";

const FILTER_TABS: Array<{ key: string; status?: EventStatus }> = [
  { key: "All" },
  { key: "Draft", status: "draft" },
  { key: "Ready", status: "active_ready" },
  { key: "Live", status: "active_live" },
  { key: "Ended", status: "ended" },
];

const statusLabel: Record<EventStatus, string> = {
  draft: "Draft",
  active_ready: "Ready",
  active_live: "Live",
  ended: "Ended",
};

export default function DashboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      const { data } = await supabase.from("events").select("*").order("status_changed_at", { ascending: false });
      setEvents((data || []) as EventRow[]);
      setLoading(false);
    })();
  }, []);

  const createEvent = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Not logged in (no user session found)."); return; }
    const { data, error } = await supabase
      .from("events")
      .insert({ account_id: user.id, name: "Untitled Event" })
      .select("id")
      .single();
    if (error) { alert(`Error creating event: ${error.message}`); return; }
    if (data) router.push(`/dashboard/events/${data.id}`);
  };

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
  };

  const statusOrder: Record<EventStatus, number> = { active_live: 0, active_ready: 1, draft: 2, ended: 3 };

  const filtered = filter === "All"
    ? [...events].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    : events.filter((e) => e.status === FILTER_TABS.find((t) => t.key === filter)?.status);

  return (
    <PlannerLayout userEmail={email} onLogout={logout} onLogoClick={() => router.push("/")}>
      <div style={{ padding: isMobile ? "20px 16px 60px" : "36px 40px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
          <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, letterSpacing: "-.02em" }}>Your Events</div>
          <Button variant="primary" onClick={createEvent}>+ New Event</Button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 12, padding: 4, width: "fit-content", border: "1px solid var(--line-soft)" }}>
            {FILTER_TABS.map(({ key }) => {
              const count = key === "All" ? events.length : events.filter((e) => e.status === FILTER_TABS.find((t) => t.key === key)?.status).length;
              return (
                <button key={key} onClick={() => setFilter(key)} style={{
                  padding: isMobile ? "6px 10px" : "7px 12px",
                  borderRadius: 9, border: 0, cursor: "pointer",
                  fontFamily: "var(--font-ui)", fontSize: isMobile ? 12 : 13, fontWeight: 500,
                  background: filter === key ? "#fff" : "transparent",
                  color: filter === key ? "var(--ink)" : "var(--ink-mute)",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {key}
                  {!isMobile && <span style={{ background: filter === key ? "var(--canvas)" : "transparent", color: filter === key ? "var(--ink-soft)" : "var(--ink-mute)", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No events yet</div>
            <div style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 24 }}>Create your first event to get started.</div>
            <Button variant="primary" onClick={createEvent}>+ Create your first event</Button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: isMobile ? 12 : 16 }}>
            {filtered.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </PlannerLayout>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const isMobile = useIsMobile();
  const date = event.event_date ? new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "Date TBC";
  const subtext = event.status === "draft" ? "Not activated yet"
    : event.status === "active_ready" ? "Ready to go live"
    : event.status === "active_live" ? "Live now"
    : "Event ended";
  const isLive = event.status === "active_live";
  const isReady = event.status === "active_ready";

  if (isLive || isReady) {
    const grad = isLive ? "var(--grad-mint)" : "var(--grad-sky)";
    return (
      <Link href={`/dashboard/events/${event.id}`} style={{ gridColumn: "1 / -1", textDecoration: "none", color: "inherit" }}>
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          overflow: "hidden", border: "1px solid var(--line-soft)", borderRadius: 18,
          boxShadow: "var(--shadow-card)", background: "var(--surface)",
        }}>
          <div style={{ flex: 1, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Badge status={event.status}>{statusLabel[event.status]}</Badge>
              <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{date}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 5 }}>{event.name}</div>
            <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>{subtext}</div>
          </div>
          <div style={{ width: isMobile ? "100%" : "calc(50% - 8px)", display: "flex", padding: isMobile ? "0 16px 16px" : "16px 16px 16px 0px" }}>
            <div style={{
              flex: 1, background: grad, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 12, fontSize: 16, fontWeight: 700, height: isMobile ? 52 : "auto",
            }}>
              {isLive ? "Live Control" : "Start Live ✦"}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/dashboard/events/${event.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--line-soft)",
        borderRadius: 18, padding: 22, boxShadow: "var(--shadow-card)", cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Badge status={event.status}>{statusLabel[event.status]}</Badge>
          <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{date}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 5 }}>{event.name}</div>
        <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>{subtext}</div>
      </div>
    </Link>
  );
}
