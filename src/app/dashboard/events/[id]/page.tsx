"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge, Button, CopyableField, Field, GuestPreviewCard, IdleCard, LiveWallCard, Modal, PlannerLayout, PreviewFrame, SectionCard, Spinner, gradientText,
  UploadZone, acToSolid, useIsMobile,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatRemaining } from "@/lib/format";
import type { EventRow, EventStatus, LogoSize } from "@/types/db";

const GRADIENT_PRESETS = [
  { label: "G4 · Mint",    gradient: "linear-gradient(135deg, #5CC9A7, #93DA8D)", solid: "#5CC9A7" },
  { label: "Sunset",       gradient: "linear-gradient(135deg, #FF9A6B, #FF6F91)", solid: "#FF9A6B" },
  { label: "Citrus",       gradient: "linear-gradient(135deg, #FFD166, #93DA8D)", solid: "#C8951A" },
  { label: "Sky",          gradient: "linear-gradient(135deg, #6FB1FC, #5CC9A7)", solid: "#6FB1FC" },
  { label: "Rose Blush",   gradient: "linear-gradient(135deg, #F9A8D4, #FF6E7F)", solid: "#F472B6" },
  { label: "Lavender",     gradient: "linear-gradient(135deg, #C4B5FD, #F0ABFC)", solid: "#A78BFA" },
  { label: "Champagne",    gradient: "linear-gradient(135deg, #F9D7A0, #FF9A6B)", solid: "#D97B4F" },
];

const FONT_OPTIONS = [
  { value: "Prompt", label: "Prompt" },
  { value: "Mitr", label: "Mitr" },
  { value: "Sarabun", label: "Sarabun" },
  { value: "Charm", label: "Charm" },
];

const DURATIONS = [10, 15, 20, 25, 30];

const LOGO_SIZES: LogoSize[] = ["S", "M", "L"];

export default function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isMobile = useIsMobile();
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [saveBlink, setSaveBlink] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingGuestBg, setUploadingGuestBg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const [chargeSecondsLeft, setChargeSecondsLeft] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(data as EventRow);
      setLoading(false);
    })();
  }, [id, supabase]);

  // While waiting on payment, poll for the Omise webhook flipping the event
  // to active_ready — covers the case where the planner left the activate
  // page and paid later without revisiting it.
  useEffect(() => {
    if (!event || event.status !== "draft") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      if (data && data.status !== "draft") {
        setEvent(data as EventRow);
        if (data.status === "active_ready") {
          setJustActivated(true);
          setTimeout(() => setJustActivated(false), 6000);
        }
        clearInterval(interval);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [event?.status, id, supabase]);

  // Tick down the active PromptPay charge's expiry so the "Activate Event"
  // button can show how long the planner has left to pay.
  useEffect(() => {
    const expiresAt = event?.omise_charge_expires_at ? new Date(event.omise_charge_expires_at).getTime() : null;
    if (event?.status !== "draft" || !expiresAt) {
      setChargeSecondsLeft(null);
      return;
    }
    const tick = () => setChargeSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [event?.status, event?.omise_charge_expires_at]);

  const update = useCallback(async (patch: Partial<EventRow>) => {
    if (!event) return;
    setEvent({ ...event, ...patch });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from("events").update(patch).eq("id", event.id);
      setSaveBlink(true); setTimeout(() => setSaveBlink(false), 1200);
    }, 400);
  }, [event, supabase]);

  const setStatus = async (status: EventStatus, extra: Partial<EventRow> = {}) => {
    if (!event) return;
    const patch = { status, ...extra };
    await supabase.from("events").update(patch).eq("id", event.id);
    setEvent({ ...event, ...patch });
  };

  const uploadBranding = async (
    file: File,
    column: "display_bg_url" | "guest_bg_url" | "logo_url",
    setUploading: (v: boolean) => void
  ) => {
    if (!event) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${event.id}/${column}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("event-branding").upload(path, file, { upsert: true });
    if (upErr) { alert(`Upload failed: ${upErr.message}`); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("event-branding").getPublicUrl(path);
    await update({ [column]: pub.publicUrl });
    setUploading(false);
  };

  const removeBranding = async (column: "display_bg_url" | "guest_bg_url" | "logo_url") => {
    await update({ [column]: null });
  };

  if (loading) {
    return (
      <PlannerLayout userEmail={email} onLogoClick={() => router.push("/")} onLogout={async () => { await supabase.auth.signOut(); router.push("/"); }} hideHeader>
        <div style={{ textAlign: "center", padding: 60 }}><Spinner /></div>
      </PlannerLayout>
    );
  }
  if (!event) {
    return (
      <PlannerLayout userEmail={email} hideHeader>
        <div style={{ padding: 40, textAlign: "center" }}>Event not found.</div>
      </PlannerLayout>
    );
  }

  const isDraft = event.status === "draft";
  const isReady = event.status === "active_ready";
  const isLive = event.status === "active_live";
  const isEnded = event.status === "ended";
  const isActiveBanner = isReady || isLive;
  const pad = isMobile ? "0 16px" : "0 40px";
  const headerRow1H = isMobile ? 26 : 30;
  const headerTotalH = isMobile ? 155 : 94;
  const headerGrad = isLive ? "var(--grad-mint)" : "var(--grad-sky)";
  const guestUrl = `${typeof window !== "undefined" ? location.origin : ""}/upload/${event.id}`;
  const displayUrl = `${typeof window !== "undefined" ? location.origin : ""}/display/${event.id}`;

  // Live previews — shown inline on mobile, gathered into a sticky rail on desktop
  const textPreview = (
    <PreviewFrame label="Text preview">
      <div style={{ fontFamily: event.display_font, fontSize: 28, fontWeight: 800, ...gradientText(event.accent_color) }}>
        {event.name}
      </div>
    </PreviewFrame>
  );
  const waitingPreview = (
    <PreviewFrame label="Waiting screen preview" aspect="16/9">
      <IdleCard accent={event.accent_color} font={event.display_font}
        bg={event.display_bg_url} eventName={event.name} eventId={event.id} previewEmpty />
    </PreviewFrame>
  );
  const liveWallPreview = (
    <PreviewFrame label="Live wall screen preview" aspect="16/9">
      <LiveWallCard accent={event.accent_color}
        photo={null} logo={event.logo_url} logoSize={event.logo_size}
        guestName="คุณเบิร์ด" message="ขอให้บ่าวสาวมีความสุขมากๆนะครับ ❤️" previewEmpty />
    </PreviewFrame>
  );
  const guestPreview = (
    <PreviewFrame label="Guest screen preview" aspect="4/9" maxWidth={280}>
      <GuestPreviewCard accent={event.accent_color} font={event.display_font}
        bg={event.guest_bg_url} eventName={event.name} eventDate={event.event_date} previewEmpty />
    </PreviewFrame>
  );
  const guestPreviewFill = (
    <PreviewFrame label="Guest screen preview" aspect="4/9" fillHeight>
      <GuestPreviewCard accent={event.accent_color} font={event.display_font}
        bg={event.guest_bg_url} eventName={event.name} eventDate={event.event_date} previewEmpty />
    </PreviewFrame>
  );

  return (
    <PlannerLayout userEmail={email} onLogoClick={() => router.push("/")} onLogout={async () => { await supabase.auth.signOut(); router.push("/"); }} hideHeader>
      {justActivated && (
        <div style={{
          background: "var(--grad-mint)", color: "#fff",
          padding: "12px 16px", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(92,201,167,.35)",
          animation: "banner-slide-down .35s ease-out",
        }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,.25)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🎉</span>
          <span>ชำระเงินสำเร็จแล้ว! อีเวนต์ของคุณเปิดใช้งานแล้ว</span>
          <style jsx>{`
            @keyframes banner-slide-down {
              from { opacity: 0; transform: translateY(-100%); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
      {/* Row 1: Back to Dashboard / Saved indicator — normal flow, scrolls away */}
      {isActiveBanner ? (
        <div style={{ background: headerGrad, backgroundSize: `100% ${headerTotalH}px`, backgroundPosition: "0 0", padding: isMobile ? "10px 0 0" : "12px 0 0", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: pad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/dashboard" style={{ fontSize: 13, color: "#fff", opacity: 0.85, display: "block" }}>← Back to Dashboard</Link>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, opacity: saveBlink ? 0.9 : 0, transition: "opacity .2s" }}>Saved ✓</div>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--canvas)", padding: isMobile ? "10px 0 0" : "12px 0 0", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: pad, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/dashboard" style={{ fontSize: 13, color: "var(--coral)", display: "block" }}>← Back to Dashboard</Link>
            <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600, opacity: saveBlink ? 1 : 0, transition: "opacity .2s" }}>Saved ✓</div>
          </div>
        </div>
      )}

      {/* Row 2: title + badge + action — sticky at top of viewport */}
      {isActiveBanner ? (
        <div style={{ background: headerGrad, backgroundSize: `100% ${headerTotalH}px`, backgroundPosition: `0 -${headerRow1H}px`, padding: isMobile ? "10px 0 8px" : "12px 0 12px", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: pad }}>
            <div style={{ display: "flex", alignItems: "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 14 }}>
              {editingTitle ? (
                <input autoFocus value={event.name} onChange={(e) => update({ name: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                  style={{ fontSize: 26, fontWeight: 800, border: 0, borderBottom: "2px solid #fff", outline: 0, background: "transparent", color: "#fff", flex: 1 }} />
              ) : (
                <span onClick={() => setEditingTitle(true)} style={{ fontWeight: 800, color: "#fff", fontSize: 26, flex: isMobile ? "none" : 1, cursor: "text" }}>{event.name}</span>
              )}
              {isLive && <Badge status="active_live">Live now</Badge>}
              <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
                {isReady && (
                  <button onClick={() => { setShowStartModal(true); setConfirmText(""); }} style={{
                    background: "rgba(255,255,255,.95)", border: 0, borderRadius: 10, padding: "0 16px",
                    fontFamily: "var(--font-ui)", cursor: "pointer", whiteSpace: "nowrap", height: 40,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6, lineHeight: 1,
                    fontSize: 15, color: "#000", fontWeight: 600, flex: isMobile ? 1 : "none",
                  }}>Start Live ✦</button>
                )}
                <Link href={`/dashboard/events/${event.id}/control`} style={{
                  borderRadius: 10, padding: "0 16px", fontFamily: "var(--font-ui)", textDecoration: "none",
                  whiteSpace: "nowrap", fontWeight: 600, fontSize: 15, height: 40, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isLive ? "#1A1A1A" : "#fff",
                  background: isLive ? "#fff" : "rgba(255,255,255,0)",
                  border: isLive ? "0" : "1px solid rgba(255,255,255,.8)",
                  flex: isMobile ? 1 : "none",
                }}>Live Control</Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--canvas)", padding: isMobile ? "10px 0 8px" : "12px 0 12px", marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw", position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--line-soft)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: pad }}>
            <div style={{ display: "flex", alignItems: "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 14 }}>
              {editingTitle ? (
                <input autoFocus value={event.name} onChange={(e) => update({ name: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                  style={{ fontSize: 26, fontWeight: 800, border: 0, borderBottom: "2px solid var(--mint-500)", outline: 0, background: "transparent", color: "var(--ink)", flex: 1 }} />
              ) : (
                <span onClick={() => isDraft && setEditingTitle(true)} style={{ fontWeight: 800, color: "var(--ink)", fontSize: 26, flex: isMobile ? "none" : 1, cursor: isDraft ? "text" : "default" }}>{event.name}</span>
              )}
              {isDraft && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "stretch" : "flex-end", gap: 4, width: isMobile ? "100%" : "auto" }}>
                  <Link href={`/dashboard/events/${event.id}/activate`}>
                    <Button variant="primary" fullWidth={isMobile}>Activate Event — เพียง 1,400 บาท</Button>
                  </Link>
                  {chargeSecondsLeft !== null && chargeSecondsLeft > 0 && (
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", textAlign: isMobile ? "left" : "right" }}>
                      กรุณาชำระภายใน {formatRemaining(chargeSecondsLeft)}
                    </div>
                  )}
                </div>
              )}
              {isEnded && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 18px", height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "#E9E9E9", color: "#898D94", fontWeight: 600 }}>Event Ended</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: isMobile ? "20px 16px 60px" : "32px 40px 80px", display: "flex", flexDirection: "column", gap: 20 }}>
        {isActiveBanner && (
          <>
            <SectionCard title="ลิ้งค์สำหรับให้แขกโพส" subtitle="พิมพ์หรือแสดง QR ที่งาน ให้แขกสแกนเพื่ออัปโหลดรูปและข้อความ">
              <CopyableField value={guestUrl} onOpen={() => window.open(`/upload/${event.id}`, "_blank")} />
            </SectionCard>
            <SectionCard title="ลิ้งค์สำหรับหน้าจอไลฟ์" subtitle="เปิด URL นี้บนจอที่งาน แล้วกด F11 เพื่อเข้าสู่โหมดเต็มหน้าจอ">
              <CopyableField value={displayUrl} onOpen={() => window.open(`/display/${event.id}`, "_blank")} />
            </SectionCard>
          </>
        )}

        {!isLive && !isEnded && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <SectionCard title="รายละเอียดงาน">
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  <Field label="Event name" value={event.name} onChange={(v) => update({ name: v })} required helperTop
                    helper="ชื่อนี้จะปรากฏบนหน้าจอในงาน และบนหน้าอัปโหลดรูปของแขก" />
                  <Field label="Event date" type="date" value={event.event_date || ""} onChange={(v) => update({ event_date: v || null })} helperTop
                    helper="ใช้แสดงในหน้า Dashboard ของคุณเท่านั้น" />
                </div>
              </SectionCard>

              <div style={{
                display: isMobile ? "block" : "grid",
                gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
                gap: 20, alignItems: "start",
              }}>
                <SectionCard title="ปรับแต่งตีม">
                  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {isMobile && textPreview}

                    {/* Accent color */}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Accent color</div>
                      <div style={{ color: "var(--ink-mute)", marginBottom: 12, fontSize: 14 }}>สีหลักที่จะใช้แสดงในมือถือของแขก และข้อความบนหน้าจอ</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {GRADIENT_PRESETS.map((p) => {
                          const sel = event.accent_color === p.gradient;
                          return (
                            <button key={p.label} onClick={() => update({ accent_color: p.gradient })} title={p.label}
                              style={{
                                width: 40, height: 32, background: p.gradient, border: 0,
                                borderRadius: 12, cursor: "pointer",
                                boxShadow: sel ? `0 0 0 2px #fff, 0 0 0 4px ${p.solid}` : "var(--shadow-card)",
                              }} />
                          );
                        })}
                        {(() => {
                          const isCustom = !GRADIENT_PRESETS.some((p) => p.gradient === event.accent_color);
                          const solid = acToSolid(event.accent_color);
                          return (
                            <div title="Custom color" style={{
                              position: "relative", width: 40, height: 32, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", borderRadius: 12,
                              background: isCustom ? solid : "var(--surface-2)",
                              boxShadow: isCustom ? `0 0 0 2px #fff, 0 0 0 4px ${solid}` : "var(--shadow-card)",
                            }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                                stroke={isCustom ? "rgba(255,255,255,.85)" : "var(--ink-soft)"}
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 22l1-1h3l9-9" /><path d="M3 21v-3l9-9" />
                                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-2.2 2.2-1-1" />
                              </svg>
                              <input type="color" value={solid} onChange={(e) => update({ accent_color: e.target.value })}
                                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", padding: 0, border: 0 }} />
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Font */}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Display font</div>
                      <div style={{ color: "var(--ink-mute)", marginBottom: 12, fontSize: 14 }}>ฟอนต์ที่จะใช้แสดงชื่องานในมือถือของแขก และข้อความบนหน้าจอ</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {FONT_OPTIONS.map((f) => (
                          <button key={f.value} onClick={() => update({ display_font: f.value })} style={{
                            fontFamily: f.value, fontWeight: 600, borderRadius: 12, cursor: "pointer",
                            border: `1px solid ${event.display_font === f.value ? "var(--mint-500)" : "var(--line)"}`,
                            background: event.display_font === f.value ? "rgba(92,201,167,.06)" : "var(--surface)",
                            color: "var(--ink)", fontSize: 14, height: 32, padding: "4px 14px",
                          }}>{f.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {!isMobile && (
                  <div style={{ position: "sticky", top: 84 }}>
                    {textPreview}
                  </div>
                )}
              </div>

              <div style={{
                display: isMobile ? "block" : "grid",
                gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
                gap: 20, alignItems: "start",
              }}>
                <SectionCard title="ปรับแต่งหน้าจอรอไลฟ์">
                  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {isMobile && waitingPreview}

                    {/* Display background */}
                    <UploadZone
                      label="Display Screen Image"
                      helper="รูปนี้จะแสดงบนหน้าจอในงานตอนที่รอแขกอัพโหลดรูปและข้อความ แนะนำให้ใช้รูปแนวนอนที่แคบกว่าความกว้างหน้าจอเล็กน้อย"
                      previewUrl={event.display_bg_url}
                      uploading={uploadingBg}
                      aspect="3/4"
                      scale="natural-height"
                      height="40vh"
                      onUpload={(f) => uploadBranding(f, "display_bg_url", setUploadingBg)}
                      onRemove={() => removeBranding("display_bg_url")}
                    />
                  </div>
                </SectionCard>

                {!isMobile && (
                  <div style={{ position: "sticky", top: 84 }}>
                    {waitingPreview}
                  </div>
                )}
              </div>

              <div style={{
                display: isMobile ? "block" : "grid",
                gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
                gap: 20, alignItems: "start",
              }}>
                <SectionCard title="ปรับแต่งหน้าจอไลฟ์">
                  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {isMobile && liveWallPreview}

                    {/* Logo */}
                    <UploadZone
                      label="Event Logo"
                      helper="โลโก้จะปรากฏที่มุมล่างของหน้าจอในงาน แนะนำให้ใช้ไฟล์ PNG พื้นหลังโปร่งใส สามารถใช้ขนาดตามโลโก้ที่มีได้เลย"
                      previewUrl={event.logo_url}
                      uploading={uploadingLogo}
                      scale="natural"
                      height="30vh"
                      onUpload={(f) => uploadBranding(f, "logo_url", setUploadingLogo)}
                      onRemove={() => removeBranding("logo_url")}
                    />

                    {/* Logo size */}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Logo Size</div>
                      <div style={{ color: "var(--ink-mute)", marginBottom: 12, fontSize: 14 }}>ขนาดโลโก้ที่แสดงบนหน้าจอไลฟ์</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {LOGO_SIZES.map((s) => (
                          <button key={s} onClick={() => update({ logo_size: s })} style={{
                            borderRadius: 12, cursor: "pointer",
                            border: `1px solid ${event.logo_size === s ? "var(--mint-500)" : "var(--line)"}`,
                            background: event.logo_size === s ? "rgba(92,201,167,.06)" : "var(--surface)",
                            height: 32, width: 44,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>Display pace</div>
                      <div style={{ color: "var(--ink-mute)", marginBottom: 12, fontSize: 14 }}>ระยะเวลาที่แต่ละโพสต์ของแขกจะแสดงบนหน้าจอ</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {DURATIONS.map((d) => (
                          <button key={d} onClick={() => update({ post_duration_seconds: d })} style={{
                            borderRadius: 12, cursor: "pointer",
                            border: `1px solid ${event.post_duration_seconds === d ? "var(--mint-500)" : "var(--line)"}`,
                            background: event.post_duration_seconds === d ? "rgba(92,201,167,.06)" : "var(--surface)",
                            height: 32, padding: "0 14px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{d}</span>
                            <span style={{ fontWeight: 500, color: "var(--ink-mute)", fontSize: 12, marginLeft: 4, lineHeight: 1 }}>Sec</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {!isMobile && (
                  <div style={{ position: "sticky", top: 84 }}>
                    {liveWallPreview}
                  </div>
                )}
              </div>

              <div style={{
                display: isMobile ? "block" : "grid",
                gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
                gap: 20, alignItems: "stretch",
              }}>
                <SectionCard title="ปรับแต่งหน้าจอมือถือแขก">
                  <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                    {isMobile && guestPreview}

                    {/* Guest hero */}
                    <UploadZone
                      label="Guest Screen Image"
                      helper="รูปนี้จะแสดงในมือถือของแขกในหน้าแชร์ข้อความและรูปภาพ แนะนำให้ใช้รูปในแนวตั้ง อัตราส่วน 3:4"
                      previewUrl={event.guest_bg_url}
                      uploading={uploadingGuestBg}
                      aspect="3/4"
                      scale="height"
                      height="40vh"
                      onUpload={(f) => uploadBranding(f, "guest_bg_url", setUploadingGuestBg)}
                      onRemove={() => removeBranding("guest_bg_url")}
                    />
                  </div>
                </SectionCard>

                {!isMobile && guestPreviewFill}
              </div>
            </div>

            {isDraft && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "stretch" : "flex-end", gap: 4 }}>
                <Link href={`/dashboard/events/${event.id}/activate`}>
                  <Button variant="primary" fullWidth={isMobile}>Activate Event — เพียง 1,400 บาท</Button>
                </Link>
                {chargeSecondsLeft !== null && chargeSecondsLeft > 0 && (
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", textAlign: isMobile ? "left" : "right" }}>
                    กรุณาชำระภายใน {formatRemaining(chargeSecondsLeft)}
                  </div>
                )}
              </div>
            )}
            {isReady && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                gap: isMobile ? 10 : 20, flexDirection: isMobile ? "column-reverse" : "row",
              }}>
                <p style={{ fontSize: 13, color: "var(--ink-mute)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                  หลังจากเริ่มไลฟ์จะไม่สามารถแก้ไขข้อมูลอีเวนท์ได้<br /><b>ระวัง! กดเริ่ม live อย่างรอบคอบ!</b>
                </p>
                <button onClick={() => { setShowStartModal(true); setConfirmText(""); }} style={{
                  background: "var(--grad-sky)", border: 0, borderRadius: 14, padding: "12px 24px",
                  fontFamily: "var(--font-ui)", fontWeight: 800, color: "#fff", cursor: "pointer",
                  letterSpacing: "-.01em", boxShadow: "0 4px 16px rgba(111,177,252,.35)", lineHeight: 1,
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                  fontSize: 15, width: isMobile ? "100%" : "auto", justifyContent: "center",
                }}>Start Live ✦</button>
              </div>
            )}
          </>
        )}

        {(isLive || isEnded) && (
          <SectionCard title="รายละเอียดงาน">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Event name", val: event.name },
                { label: "Event date", val: event.event_date || "—" },
                { label: "Display font", val: <span style={{ fontFamily: event.display_font }}>{event.display_font}</span> },
                { label: "Post duration", val: `${event.post_duration_seconds} seconds` },
              ].map((row) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr", gap: 8 }}>
                  <span style={{ color: "var(--ink-mute)", fontSize: 14, fontWeight: 500 }}>{row.label}</span>
                  <span style={{ color: "var(--ink)", fontSize: 14 }}>{row.val}</span>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr", gap: 8 }}>
                <span style={{ color: "var(--ink-mute)", fontSize: 14, fontWeight: 500 }}>Accent color</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 999, background: event.accent_color, display: "inline-block" }} />
                  <span style={{ fontSize: 14, fontFamily: "monospace" }}>{event.accent_color}</span>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {isLive && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="danger" onClick={() => { setShowEndModal(true); setConfirmText(""); }}>End Live</Button>
          </div>
        )}
      </div>

      {showStartModal && (
        <Modal
          title="Start Live for this event?"
          body={<div>
            <p>หลังจากเริ่มไลฟ์จะไม่สามารถแก้ไขข้อมูลได้ และจะมีเวลาไลฟ์ 6 ชั่วโมง</p>
            <p style={{ fontWeight: 500, marginTop: 12 }}>พิมพ์ชื่องาน <strong>{event.name}</strong> เพื่อยืนยัน</p>
            <input autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={event.name}
              style={{ width: "100%", marginTop: 8, padding: "10px 14px", borderRadius: 10, border: `1px solid ${confirmText === event.name ? "var(--mint-500)" : "var(--line)"}`, fontFamily: "var(--font-ui)", fontSize: 14, outline: 0 }} />
          </div>}
          onCancel={() => setShowStartModal(false)}
          onConfirm={() => {
            if (confirmText !== event.name) return;
            const start = new Date();
            const expires = new Date(start.getTime() + 6 * 60 * 60 * 1000);
            setStatus("active_live", { live_started_at: start.toISOString(), live_expires_at: expires.toISOString() });
            setShowStartModal(false);
          }}
          confirmText="Start Live ✦"
        />
      )}

      {showEndModal && (
        <Modal
          title="End this live event?"
          body={<div>
            <p>แขกจะไม่สามารถส่งรูปได้อีก อีเวนท์จะสิ้นสุดลงและเปลี่ยนสถานะเป็น end</p>
            <p style={{ fontWeight: 500, marginTop: 12 }}>พิมพ์ชื่องาน <strong>{event.name}</strong> เพื่อยืนยัน</p>
            <input autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={event.name}
              style={{ width: "100%", marginTop: 8, padding: "10px 14px", borderRadius: 10, border: `1px solid ${confirmText === event.name ? "#DC2626" : "var(--line)"}`, fontFamily: "var(--font-ui)", fontSize: 14, outline: 0 }} />
          </div>}
          onCancel={() => setShowEndModal(false)}
          onConfirm={() => {
            if (confirmText !== event.name) return;
            setStatus("ended");
            setShowEndModal(false);
          }}
          confirmText="End Live"
          danger
        />
      )}
    </PlannerLayout>
  );
}
