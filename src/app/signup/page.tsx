"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, FormCard, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "กรุณากรอกอีเมล";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "กรุณากรอกอีเมลที่ถูกต้อง";
    if (!pw) e.pw = "กรุณากรอกรหัสผ่าน";
    else if (pw.length < 8) e.pw = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    if (pw !== pw2) e.pw2 = "รหัสผ่านไม่ตรงกัน";
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) { setErrors({ email: error.message }); return; }
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout>
        <FormCard>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--grad-mint)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>ตรวจสอบอีเมลของคุณ</div>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 24 }}>
              เราส่งลิงก์ยืนยันไปที่ <strong>{email}</strong> แล้ว
            </div>
            <Button variant="secondary" fullWidth onClick={() => router.push("/login")}>ไปที่หน้าเข้าสู่ระบบ</Button>
          </div>
        </FormCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <FormCard>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 4 }}>สร้างบัญชีของคุณ</div>
        <div style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 28 }}>เริ่มสร้างอีเวนท์แรกของคุณได้ภายในไม่กี่นาที</div>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="อีเมล" type="email" placeholder="you@example.com" value={email} onChange={setEmail} error={errors.email} required />
          <Field label="รหัสผ่าน" type="password" placeholder="อย่างน้อย 8 ตัวอักษร" value={pw} onChange={setPw} error={errors.pw} required />
          <Field label="ยืนยันรหัสผ่าน" type="password" placeholder="ใส่รหัสผ่านอีกครั้ง" value={pw2} onChange={setPw2} error={errors.pw2} required />
          <Button variant="primary" fullWidth disabled={loading} type="submit">
            {loading ? <Spinner size={18} color="#fff" /> : "สร้างบัญชี"}
          </Button>
        </form>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "var(--ink-soft)" }}>
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" style={{ color: "var(--coral)", fontWeight: 600 }}>เข้าสู่ระบบ</Link>
        </div>
      </FormCard>
    </AuthLayout>
  );
}
