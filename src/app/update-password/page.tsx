"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { Button, Field, FormCard, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!pw || !pw2) { setError("กรุณากรอกข้อมูลให้ครบ"); return; }
    if (pw !== pw2) { setError("Passwords don't match"); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  };

  return (
    <AuthLayout>
      <FormCard>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>อัปเดตรหัสผ่านแล้ว!</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 24 }}>ตั้งรหัสผ่านใหม่</div>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="รหัสผ่านใหม่" type="password" placeholder="At least 8 characters" value={pw} onChange={(v) => { setPw(v); setError(""); }} error={error} />
              <Field label="ยืนยันรหัสผ่านใหม่" type="password" placeholder="Repeat your password" value={pw2} onChange={setPw2} />
              <Button variant="primary" fullWidth disabled={loading} type="submit">
                {loading ? <Spinner size={18} color="#fff" /> : "อัปเดตรหัสผ่าน"}
              </Button>
            </form>
          </div>
        )}
      </FormCard>
    </AuthLayout>
  );
}
