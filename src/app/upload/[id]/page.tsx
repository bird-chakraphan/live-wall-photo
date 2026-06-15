"use client";
import { use, useEffect, useRef, useState } from "react";
import { acToSolid, gradientText, Spinner, TestModeBanner, TestModeDiagonalOverlay } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type PublicEvent = {
  id: string; name: string; event_date: string | null;
  status: "active_ready" | "active_live";
  accent_color: string; display_font: string;
  guest_bg_url: string | null; logo_url: string | null;
};

const COPY = {
  th: {
    welcome: "ยินดีต้อนรับเข้าสู่งานแต่งงานของ",
    cta: "ส่งความรู้สึกดีๆให้บ่าวสาว",
    name_label: "😊 กรอกชื่อที่บ่าวสาว เห็นปุ๊ป รู้ปั๊ป 🤭",
    name_ph: "จะชื่อเล่น หรือฉายาก็โอเคนะ",
    photo_label: "📷 แนบรูปสวยๆกันมาเลย 📸",
    photo_helper: "กดเพื่อเปิดกล้องถ่ายรูป",
    msg_label: "🥂 มาอวยพรให้บ่าวสาวกัน 🎉",
    msg_ph: "อยากจะบอกอะไรบ่าวสาว เขียนตรงนี้ได้เลย",
    submit: "แตะเพื่อส่งความรู้สึก",
    submitting: "กำลังส่ง...",
    err_name: "บอกชื่อด้วยนะคะ",
    err_photo: "เลือกรูปก่อนนะคะ",
    err_msg: "ฝากข้อความด้วยนะคะ",
    success_headline: "ส่งแล้ว! 🎉",
    success_body1: "โมเมนต์ของคุณกำลังจะปรากฏบนหน้าจอ",
    success_body2: "คอยมองหาชื่อคุณที่จอใหญ่ได้เลย 👀",
    send_another: "ส่งอีกรูปได้เลยนะคะ →",
  },
  en: {
    welcome: "you are welcome to",
    cta: "Ready to share your love?",
    name_label: "😊 Let us know who you are 🤭",
    name_ph: "Nickname, alias — anything goes",
    photo_label: "📷 Share a photo with us 📸",
    photo_helper: "Open camera & shoot",
    msg_label: "🥂 Send us your wishes 🎉",
    msg_ph: "What do you want to say?",
    submit: "Tap to send your love",
    submitting: "Sending...",
    err_name: "Don't forget your name!",
    err_photo: "Add a photo first",
    err_msg: "Write them something!",
    success_headline: "Up on the screen! 🎉",
    success_body1: "Your moment is about to appear on the big display.",
    success_body2: "Watch for your name up there 👀",
    send_another: "Send one more →",
  },
};

export default function GuestUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("event_public", { p_id: id });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setNotFound(true);
        return;
      }
      setEvent((Array.isArray(data) ? data[0] : data) as PublicEvent);
    })();
  }, [id]);

  const c = COPY[lang];
  const ac = event?.accent_color || "#FF7A59";
  const isTestMode = event?.status === "active_ready";

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = c.err_name;
    if (!photo) e.photo = c.err_photo;
    if (!msg.trim()) e.msg = c.err_msg;
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    const fd = new FormData();
    fd.append("event_id", id);
    fd.append("guest_name", name);
    fd.append("message", msg);
    fd.append("photo", photo!);
    const res = await fetch("/api/submissions", { method: "POST", body: fd });
    setLoading(false);
    if (res.ok) {
      setSent(true);
      return;
    }
    if (res.status === 415) {
      setErrors({ photo: "ไฟล์รูปภาพนี้ไม่รองรับ ลองเปลี่ยนเป็น JPEG หรือ PNG นะคะ" });
      return;
    }
    setErrors({ msg: "ส่งไม่สำเร็จ ลองอีกครั้งนะคะ" });
  };

  const reset = () => { setName(""); setPhoto(null); setPhotoPreview(null); setMsg(""); setErrors({}); setSent(false); };

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>อีเวนต์นี้ไม่พร้อมใช้งาน</div>
          <div style={{ color: "var(--ink-soft)" }}>This event isn&apos;t open for submissions.</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner /></div>;
  }

  return (
    <>
      {isTestMode && <TestModeBanner />}
      <div style={{
        minHeight: "100vh", background: "var(--canvas)", fontFamily: "var(--font-thai)",
        display: "flex", flexDirection: "column", maxWidth: 420, margin: "0 auto",
      }}>
        {/* Hero */}
        <div style={{ position: "relative", height: "75vh", overflow: "hidden" }}>
          <img src={event.guest_bg_url || "/photos/event-hero.jpg"} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>
              <img src="/assets/sparkle-mint.svg" alt="" style={{ width: 14, height: 14, filter: "brightness(0) invert(1)", opacity: 0.8 }} />
              WeddingTech
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,.18)", backdropFilter: "blur(6px)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,.4)" }}>
              {(["th", "en"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "5px 14px", border: 0, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: lang === l ? "rgba(255,255,255,.95)" : "transparent",
                  color: lang === l ? "var(--ink)" : "#fff",
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Title block */}
        <div style={{ padding: "20px 22px 4px", textAlign: "center" }}>
          <div style={{ marginBottom: 6, fontSize: 14, color: "var(--ink-soft)" }}>{c.welcome}</div>
          <div style={{ fontFamily: event.display_font, fontWeight: 800, ...gradientText(ac), fontSize: 26, marginBottom: 8 }}>
            {event.name}
          </div>
          {event.event_date && (
            <div style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 12 }}>{event.event_date}</div>
          )}
          <div style={{ background: "var(--line)", height: 2, margin: "32px 0" }} />
          <div style={{ fontWeight: 800, fontSize: 21, ...gradientText(ac) }}>{c.cta}</div>
        </div>

        {sent ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 80, height: 80, borderRadius: 999, background: "var(--grad-mint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 24, color: "#fff", boxShadow: "0 10px 28px rgba(92,201,167,.38)", animation: "bounceIn .35s ease" }}>✓</div>
            <div style={{ fontSize: 28, fontWeight: 700, ...gradientText(ac), marginBottom: 10 }}>{c.success_headline}</div>
            <div style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 6 }}>{c.success_body1}</div>
            <div style={{ fontSize: 15, color: "var(--ink-mute)", marginBottom: 28 }}>{c.success_body2}</div>
            {photoPreview && (
              <div style={{ width: "100%", maxWidth: 240, marginBottom: 24 }}>
                <img src={photoPreview} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 18, boxShadow: "var(--shadow-raised)" }} />
                {msg && <div style={{ fontSize: 14, color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.45, marginTop: 10 }}>&ldquo;{msg}&rdquo;</div>}
              </div>
            )}
            <button onClick={reset} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 15, color: "var(--ink-mute)", textDecoration: "underline", padding: "8px 0" }}>
              {c.send_another}
            </button>
          </div>
        ) : (
          <div ref={formRef} style={{ flex: 1, padding: "22px 20px 32px", display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Name */}
            <div>
              <div style={{ marginBottom: 10, textAlign: "center", fontSize: 16, fontWeight: 500 }}>{c.name_label}</div>
              <div style={{ height: 54, borderRadius: 14, background: "var(--surface)", border: `1px solid ${errors.name ? "#FCA5A5" : "var(--line)"}`, display: "flex", alignItems: "center", padding: "0 16px" }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={c.name_ph} maxLength={40}
                  style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontSize: 16, textAlign: "center", fontFamily: "var(--font-thai)" }} />
              </div>
              {errors.name && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 5, textAlign: "center" }}>{errors.name}</div>}
            </div>

            {/* Photo */}
            <div>
              <div style={{ marginBottom: 10, textAlign: "center", fontSize: 16, fontWeight: 500 }}>{c.photo_label}</div>
              {photoPreview ? (
                <div style={{ position: "relative" }}>
                  <img src={photoPreview} alt="" style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: 18, boxShadow: "var(--shadow-raised)" }} />
                  <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.45)", color: "#fff", border: 0, borderRadius: 999, padding: "5px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                    {lang === "th" ? "เปลี่ยนรูป" : "Change photo"}
                  </button>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 52, border: `2px solid ${acToSolid(ac)}`, borderRadius: 14, background: "#fff", cursor: "pointer" }}>
                  <input type="file" accept="image/*" capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 10 * 1024 * 1024) { setErrors({ photo: lang === "th" ? "รูปใหญ่เกินไปนะคะ (สูงสุด 10MB)" : "Photo too large (max 10MB)" }); return; }
                      setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); setErrors((er) => ({ ...er, photo: "" }));
                    }}
                    style={{ display: "none" }} />
                  <div style={{ color: acToSolid(ac), fontSize: 16, fontWeight: 500 }}>{c.photo_helper}</div>
                </label>
              )}
              {errors.photo && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6, textAlign: "center" }}>{errors.photo}</div>}
            </div>

            {/* Message */}
            <div>
              <div style={{ marginBottom: 10, textAlign: "center", fontSize: 16, fontWeight: 500 }}>{c.msg_label}</div>
              <div style={{ borderRadius: 14, background: "var(--surface)", border: `1px solid ${errors.msg ? "#FCA5A5" : "var(--line)"}` }}>
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={c.msg_ph} rows={4} maxLength={150}
                  style={{ display: "block", width: "100%", border: 0, outline: 0, background: "transparent", resize: "none", fontFamily: "var(--font-thai)", fontSize: 15, padding: "14px 16px", boxSizing: "border-box", lineHeight: 1.7, textAlign: "center" }} />
                <div style={{ textAlign: "right", fontSize: 12, padding: "0 14px 10px", color: msg.length >= 130 ? "#D97706" : "var(--ink-mute)" }}>{msg.length} / 150</div>
              </div>
              {errors.msg && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4, textAlign: "center" }}>{errors.msg}</div>}
            </div>

            <button onClick={submit} disabled={loading} style={{
              height: 60, border: 0, borderRadius: 16, cursor: loading ? "not-allowed" : "pointer",
              background: loading ? acToSolid(ac) + "aa" : ac,
              color: "#fff", fontFamily: "var(--font-thai)", fontSize: 18, fontWeight: 700,
              boxShadow: loading ? "none" : `0 8px 24px ${acToSolid(ac)}55`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              {loading ? <><Spinner size={20} color="#fff" />{c.submitting}</> : c.submit}
            </button>
          </div>
        )}
      </div>

      {/* Test-mode watermark */}
      {isTestMode && <TestModeDiagonalOverlay />}
    </>
  );
}
