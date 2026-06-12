"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Logo, useIsMobile } from "@/components/ui";

const MINI_SLIDES = [
  { photo: "/photos/couple.png", name: "กาย & แพร", msg: "ยินดีด้วยนะคะ Happy for you both 🥂" },
  { photo: "/photos/friends.png", name: "แก๊งหลังมอ", msg: "เห็นชอบหายไปจากกลุ่มกัน 2 คน มาวันนี้แต่งงาน 🎉🎉🎉" },
  { photo: "/photos/uncles.png", name: "น้าเปิ๊ลและสหาย", msg: "ขอให้มีความสุขมากๆนะคะ" },
];
const CYCLE_WORDS = ["คำอวยพร", "เรื่องตลก", "รอยยิ้ม", "ความรัก", "ความสุข", "ความคิดถึง"];

function MiniDisplay({ idx }: { idx: number }) {
  return (
    <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.10)", aspectRatio: "16/10" }}>
      {MINI_SLIDES.map((s, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${s.photo})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === idx ? 1 : 0, transition: "opacity .65s ease" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 55%)" }} />
      <div style={{ position: "absolute", top: 14, left: 16, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "4px 12px", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", zIndex: 2 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#FF7A59", animation: "pulse 2s infinite" }} />
        LIVE NOW
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 22px 20px" }}>
        {MINI_SLIDES.map((s, i) => (
          <div key={i} style={{ position: "absolute", bottom: 20, left: 22, opacity: i === idx ? 1 : 0, transition: "opacity .65s ease" }}>
            <div style={{ color: "#FF7A59", fontSize: 20, fontWeight: 700, fontFamily: "var(--font-thai)", letterSpacing: "-.01em" }}>{s.name}</div>
            <div style={{ color: "rgba(255,255,255,.88)", fontSize: 13, fontFamily: "var(--font-thai)", marginTop: 3 }}>{s.msg}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 14, right: 16, color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 700, letterSpacing: ".04em" }}>WeddingTech ✦</div>
    </div>
  );
}

export default function LandingPage() {
  const isMobile = useIsMobile();
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % CYCLE_WORDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh", fontFamily: "var(--font-ui)" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50, height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 40px",
        background: "rgba(242,241,239,.88)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(229,228,226,.6)",
      }}>
        <Logo size={isMobile ? 16 : 19} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login"><Button variant="ghost" size="sm">เข้าสู่ระบบ</Button></Link>
          <Link href="/signup"><Button variant="primary" size="sm">{isMobile ? "สมัคร" : "ลงทะเบียนใช้งาน"}</Button></Link>
        </div>
      </header>

      <section style={{
        maxWidth: 1160, margin: "0 auto",
        padding: isMobile ? "48px 20px 40px" : "80px 40px 72px",
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: isMobile ? 36 : 64, alignItems: "center",
      }}>
        <div>
          <div style={{ marginBottom: 16, fontSize: 14, color: "var(--ink-soft)" }}>มาเพิ่มมิติให้กับงานแต่งของคุณกัน</div>
          <h1 style={{
            fontSize: isMobile ? 36 : 52, fontWeight: 800, letterSpacing: "-.02em",
            lineHeight: 1.15, fontFamily: "var(--font-thai)", margin: "0 0 16px",
          }}>
            เมื่อทุก
            <span key={wordIdx} style={{ display: "inline-block", background: "var(--grad-mint)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "wordCycle 2.6s ease forwards", transformOrigin: "bottom center" }}>
              {CYCLE_WORDS[wordIdx]}
            </span>
            <br />แสดงบนจอในงาน
          </h1>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, margin: "0 0 28px", fontFamily: "var(--font-thai)", fontSize: 16 }}>
            สแกน QR ส่งรูปและข้อความ ทุกอย่างขึ้นจอทันที
          </p>
          {isMobile && <div style={{ marginBottom: 28 }}><MiniDisplay idx={wordIdx % MINI_SLIDES.length} /></div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: isMobile ? "stretch" : "flex-start" }}>
            <Link href="/signup"><Button variant="primary" size={isMobile ? "md" : "lg"} fullWidth={isMobile}>ลงทะเบียนใช้งาน</Button></Link>
            <div style={{ color: "var(--ink-mute)", fontSize: 14 }}>เพียง 1,400 บาทต่องาน · ไม่มีค่ารายเดือน · พร้อมใช้ใน 5 นาที</div>
          </div>
        </div>
        {!isMobile && <div><MiniDisplay idx={wordIdx % MINI_SLIDES.length} /></div>}
      </section>

      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "48px 20px" : "72px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
            <div style={{ letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 10, fontSize: 12 }}>ใช้งานยังไง</div>
            <div style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, letterSpacing: "-.01em", fontFamily: "var(--font-thai)" }}>ง่ายกว่าที่คิด ประทับใจกว่าที่คาด</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: isMobile ? 14 : 24 }}>
            {[
              { num: "01", grad: "var(--grad-sky)", title: "ตั้งค่างานของคุณล่วงหน้า", desc: "อัปโหลดภาพพื้นหลัง เลือกธีมสีและฟอนต์ แล้วรับ QR Code ไปติดที่หน้างาน" },
              { num: "02", grad: "var(--grad-sunset)", title: "แขกส่งรูปจากมือถือ", desc: "ไม่ต้องโหลดแอป แค่สแกน QR ถ่ายรูป เขียนข้อความ แล้วกดส่ง" },
              { num: "03", grad: "var(--grad-mint)", title: "ช่วงเวลานั้นขึ้นจอใหญ่", desc: "รูปและข้อความปรากฏแบบ fullscreen ทีละภาพ สลับกันตลอดงาน" },
            ].map((s) => (
              <div key={s.num} style={{ background: "var(--surface-2)", borderRadius: 20, padding: "24px 22px", border: "1px solid var(--line-soft)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: s.grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, marginBottom: 16 }}>{s.num}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-thai)" }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "var(--ink-soft)", fontFamily: "var(--font-thai)", lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "48px 20px" : "72px 40px" }}>
          <div style={{
            background: "var(--grad-mint)", borderRadius: isMobile ? 20 : 26,
            padding: isMobile ? "36px 24px" : "52px 56px",
            display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
            gap: isMobile ? 28 : 48, alignItems: "center",
          }}>
            <div>
              <div style={{ letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.7)", marginBottom: 10, fontSize: 14 }}>เพียง</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: isMobile ? 44 : 64, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", lineHeight: 1 }}>1,400 บาท</span>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>/ อีเวนท์</span>
              </div>
              <p style={{ color: "rgba(255,255,255,.85)", margin: 0, maxWidth: 480, fontFamily: "var(--font-thai)", lineHeight: 1.5, fontSize: 15 }}>
                ราคาเดียว ครอบคลุมทุกอย่างสำหรับงานนั้น ไม่ว่าจะมีแขกกี่คน
              </p>
            </div>
            <Link href="/signup" style={{ display: "block" }}>
              <button style={{ height: 56, padding: "0 36px", border: 0, borderRadius: 14, cursor: "pointer", background: "#fff", color: "var(--ink)", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-thai)", boxShadow: "0 8px 24px rgba(0,0,0,.15)", width: "100%" }}>
                เริ่มสร้างงานของคุณ
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "24px 20px" : "28px 40px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: isMobile ? 8 : 0 }}>
          <Logo size={16} />
          <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>© 2026 WeddingTech · 1,400 บาทต่องาน</div>
        </div>
      </footer>
    </div>
  );
}
