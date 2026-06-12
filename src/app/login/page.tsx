"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, FormCard, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLayout><FormCard><Spinner /></FormCard></AuthLayout>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "กรุณากรอกอีเมล";
    if (!pw) e.pw = "Password is required";
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true); setBanner("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setBanner("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"); return; }
    router.push(next);
    router.refresh();
  };

  return (
    <AuthLayout>
      <FormCard>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 28 }}>ยินดีต้อนรับกลับ</div>
        {banner && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 18 }}>{banner}</div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Email address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} error={errors.email} />
          <div>
            <Field label="รหัสผ่าน" type="password" placeholder="รหัสผ่านของคุณ" value={pw} onChange={setPw} error={errors.pw} />
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <Link href="/reset-password" style={{ fontSize: 13, color: "var(--coral)" }}>ลืมรหัสผ่าน?</Link>
            </div>
          </div>
          <Button variant="primary" fullWidth disabled={loading} type="submit">
            {loading ? <Spinner size={18} color="#fff" /> : "เข้าสู่ระบบ"}
          </Button>
        </form>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: "var(--ink-soft)" }}>
          ยังไม่มีบัญชี?{" "}
          <Link href="/signup" style={{ color: "var(--coral)", fontWeight: 600 }}>สมัครสมาชิก</Link>
        </div>
      </FormCard>
    </AuthLayout>
  );
}
