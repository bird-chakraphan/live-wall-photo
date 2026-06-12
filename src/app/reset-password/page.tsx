"use client";
import Link from "next/link";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, FormCard, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email) { setError("Email is required"); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/update-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <AuthLayout>
      <FormCard>
        {!sent ? (
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8 }}>รีเซ็ตรหัสผ่าน</div>
            <div style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 24 }}>กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์รีเซ็ตให้</div>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="อีเมล" type="email" placeholder="you@example.com" value={email} onChange={(v) => { setEmail(v); setError(""); }} error={error} />
              <Button variant="primary" fullWidth disabled={loading} type="submit">
                {loading ? <Spinner size={18} color="#fff" /> : "ส่งลิงก์รีเซ็ต"}
              </Button>
            </form>
            <div style={{ marginTop: 18, fontSize: 13 }}>
              <Link href="/login" style={{ color: "var(--coral)" }}>← กลับไปหน้าเข้าสู่ระบบ</Link>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--grad-mint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Check your email</div>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6 }}>
              เราส่งลิงก์รีเซ็ตไปที่ <strong>{email}</strong> แล้ว ลิงก์จะหมดอายุใน 1 ชั่วโมง
            </div>
          </div>
        )}
      </FormCard>
    </AuthLayout>
  );
}
