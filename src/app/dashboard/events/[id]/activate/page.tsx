"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Button, PlannerLayout, SectionCard, Spinner, useIsMobile } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { EventRow } from "@/types/db";

const PRICE_BAHT = 1400;

export default function ActivatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [stage, setStage] = useState<"form" | "success">("form");
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("events").select("*").eq("id", id).single();
      setEvent(data as EventRow);
    })();
  }, [id]);

  const startCharge = async () => {
    // POST to /api/payments/promptpay → server creates Omise source + charge,
    // returns PromptPay QR. (See app/src/app/api/payments/promptpay/route.ts.)
    const res = await fetch(`/api/payments/promptpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: id, amount: PRICE_BAHT }),
    });
    if (res.ok) {
      const j = await res.json();
      if (j.qr_image) setQrSrc(j.qr_image);
    }
  };

  useEffect(() => { startCharge(); /* eslint-disable-line */ }, []);

  // Poll event status — the Omise webhook flips it to active_ready once the
  // PromptPay charge confirms (see /api/webhooks/omise). Polling runs as soon
  // as the QR is shown so the page auto-advances without user input.
  useEffect(() => {
    if (stage !== "form") return;
    const supabase = createClient();
    const interval = setInterval(async () => {
      const { data } = await supabase.from("events").select("status").eq("id", id).single();
      if (data?.status === "active_ready") {
        clearInterval(interval);
        setStage("success");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [stage, id]);

  if (stage === "success") {
    return (
      <PlannerLayout>
        <div style={{ padding: "48px 20px 60px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, background: "var(--grad-mint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(92,201,167,.36)" }}>🎉</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>ยืนยันการชำระเงินแล้ว!</div>
          <div style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 32 }}>อีเวนต์ของคุณพร้อมแล้ว</div>
          <Button variant="primary" size="lg" onClick={() => router.push(`/dashboard/events/${id}`)}>ไปที่หน้าตั้งค่าอีเวนต์ →</Button>
        </div>
      </PlannerLayout>
    );
  }

  if (!event) {
    return <PlannerLayout><div style={{ padding: 60, textAlign: "center" }}><Spinner /></div></PlannerLayout>;
  }

  return (
    <PlannerLayout>
      <div style={{ padding: isMobile ? "20px 16px 60px" : "32px 40px 80px" }}>
        <Link href={`/dashboard/events/${id}`} style={{ fontSize: 13, color: "var(--coral)" }}>← กลับไปการตั้งค่า</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "16px 0 28px" }}>ชำระเงินเพื่อเปิดใช้งานอีเวนต์</h1>

        <SectionCard style={{ marginBottom: 20 }}>
          <div style={{ textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 14, fontSize: 14, letterSpacing: 1 }}>สรุปคำสั่งซื้อ</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>
            {event.name}
            {event.event_date && (
              <span style={{ fontWeight: 400, fontSize: 13, color: "var(--ink-mute)" }}>
                {" "}– {new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>เปิดใช้งานอีเวนต์</div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>สามารถไลฟ์ได้นานถึง 6 ชม. หลังจากเปิดใช้งานแล้วสามารถเริ่มไลฟ์เมื่อไหร่ก็ได้</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{PRICE_BAHT.toLocaleString()}.00 บาท</div>
          </div>
        </SectionCard>

        <SectionCard>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 20 }}>สแกน QR นี้ด้วยแอปธนาคารของคุณ เพื่อชำระเงิน</div>
            <div style={{ width: 200, minHeight: 283, margin: "0 auto 16px", borderRadius: 16, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E3D67", border: "2px solid #0E3D67", padding: 0 }}>
              {qrSrc ? (
                <img src={qrSrc} alt="PromptPay QR" style={{ width: "100%", height: "auto", display: "block" }} />
              ) : (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", width: "100%", padding: "0 16px", boxSizing: "border-box", textAlign: "center" }}>
                    <Spinner size={20} color="#fff" />
                    <div style={{ fontSize: 13 }}>กำลังโหลดพร้อมเพย์...</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 28, marginBottom: 6, fontWeight: 600 }}>{PRICE_BAHT.toLocaleString()}.00 บาท</div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Spinner size={14} /> กำลังรอการชำระเงิน…
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>การชำระเงินมักได้รับการยืนยันภายใน 30 วินาที</div>
          </div>
        </SectionCard>
      </div>
    </PlannerLayout>
  );
}
