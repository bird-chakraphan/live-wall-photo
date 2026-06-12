"use client";
import Link from "next/link";
import { Logo, useIsMobile } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", fontFamily: "var(--font-ui)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: isMobile ? "16px" : "22px 32px" }}>
        <Link href="/" style={{ textDecoration: "none" }}><Logo size={19} /></Link>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "8px 16px 40px" : "20px 20px 60px" }}>
        {children}
      </div>
    </div>
  );
}
