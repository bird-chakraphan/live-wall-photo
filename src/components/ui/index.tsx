"use client";
import React, { CSSProperties, ReactNode, useEffect, useState } from "react";
import type { LogoSize } from "@/types/db";

/* ──────────────── Hooks ──────────────── */
export function useIsMobile(bp = 768) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    h();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ──────────────── Helpers ──────────────── */
export function acToSolid(ac?: string | null): string {
  if (!ac) return "#FF7A59";
  if (!ac.includes("gradient")) return ac;
  const m = ac.match(/#[0-9a-fA-F]{6}/);
  return m ? m[0] : "#FF7A59";
}

export function gradientText(ac?: string | null): CSSProperties {
  if (ac && ac.includes("gradient")) {
    return {
      backgroundImage: ac,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      color: "",
      // Shrink the box to fit the text — otherwise a block-level element's
      // full-width box stretches the gradient, leaving short text showing
      // only a sliver of one color.
      display: "inline-block",
      width: "fit-content",
      maxWidth: "100%",
    };
  }
  return { color: ac || "#FF7A59" };
}

/* ──────────────── Logo ──────────────── */
export function Logo({ size = 20, light = false, onClick }: { size?: number; light?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9,
      fontSize: size, fontWeight: 700, letterSpacing: "-.01em",
      color: light ? "#fff" : "var(--ink)",
      cursor: onClick ? "pointer" : "default", userSelect: "none",
    }}>
      <img src="/assets/sparkle-mint.svg" alt="" style={{ width: size * 1.2, height: size * 1.2 }} />
      WeddingTech
    </div>
  );
}

/* ──────────────── Button ──────────────── */
type Variant = "primary" | "secondary" | "ghost" | "link" | "danger" | "success" | "coral";
type Size = "sm" | "md" | "lg";
export function Button({
  variant = "primary", size = "md", children, onClick, disabled, fullWidth, style, type = "button",
}: {
  variant?: Variant; size?: Size; children: ReactNode;
  onClick?: () => void; disabled?: boolean; fullWidth?: boolean; style?: CSSProperties;
  type?: "button" | "submit";
}) {
  const [hov, setHov] = useState(false);
  const [prs, setPrs] = useState(false);
  const sz = { sm: { h: 38, fs: 13, px: "0 18px" }, md: { h: 40, fs: 16, px: "0 18px" }, lg: { h: 56, fs: 17, px: "0 32px" } }[size];
  const base: CSSProperties = {
    border: 0, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-ui)",
    fontWeight: 500, fontSize: sz.fs, height: sz.h, padding: sz.px, borderRadius: 8,
    transition: "all .14s ease",
    transform: prs ? "scale(.97)" : hov ? "scale(1.005)" : "scale(1)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? "none" : "auto",
    width: fullWidth ? "100%" : "auto", letterSpacing: "-.01em",
    ...style,
  };
  const variants: Record<Variant, CSSProperties> = {
    primary: { color: "#fff", background: "var(--grad-mint)", boxShadow: hov ? "0 10px 24px rgba(92,201,167,.42)" : "0 4px 14px rgba(92,201,167,.28)" },
    secondary: { color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: hov ? "var(--shadow-raised)" : "var(--shadow-card)" },
    ghost: { color: "var(--ink-soft)", background: hov ? "rgba(26,26,26,.05)" : "transparent" },
    link: { color: "var(--coral)", background: hov ? "#FFE7DE" : "var(--coral-tint)", height: 42, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 },
    danger: { color: "#DC2626", background: hov ? "#FEF2F2" : "#FFFFFF", border: "1px solid #FCA5A5" },
    success: { color: "#fff", background: "#16A34A", boxShadow: hov ? "0 8px 18px rgba(22,163,74,.32)" : "none" },
    coral: { color: "#fff", background: "var(--coral)", boxShadow: hov ? "0 8px 20px rgba(255,122,89,.38)" : "0 4px 12px rgba(255,122,89,.22)" },
  };
  return (
    <button type={type} style={{ ...base, ...variants[variant] }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPrs(false); }}
      onMouseDown={() => setPrs(true)}
      onMouseUp={() => setPrs(false)}>
      {children}
    </button>
  );
}

/* ──────────────── Field ──────────────── */
export function Field({
  label, type = "text", placeholder, value, onChange, helper, helperTop, error, required, style,
}: {
  label?: string; type?: string; placeholder?: string;
  value: string; onChange?: (v: string) => void;
  helper?: string; helperTop?: boolean; error?: string; required?: boolean;
  style?: CSSProperties;
}) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const inputType = type === "password" ? (show ? "text" : "password") : type;
  return (
    <div style={style}>
      {label && (
        <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 14, height: 24 }}>
          {label}{required && <span style={{ color: "var(--coral)" }}>*</span>}
        </div>
      )}
      {helperTop && helper && <div style={{ color: "var(--ink-mute)", marginBottom: 10, lineHeight: 1.45, fontSize: 14 }}>{helper}</div>}
      <div style={{
        height: 52, borderRadius: 12, background: "var(--surface)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
        border: `1px solid ${error ? "#FCA5A5" : focus ? "var(--mint-500)" : "var(--line)"}`,
        boxShadow: error ? "0 0 0 3px rgba(220,38,38,.10)" : focus ? "0 0 0 3px rgba(92,201,167,.18)" : "none",
        transition: "border-color .14s, box-shadow .14s",
      }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          style={{ border: 0, outline: 0, background: "transparent", flex: 1, fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)" }}
        />
        {type === "password" && (
          <button type="button" onClick={() => setShow((s) => !s)}
            style={{ border: 0, background: "none", cursor: "pointer", padding: 4, color: "var(--ink-mute)", fontSize: 12, fontFamily: "var(--font-ui)", fontWeight: 500 }}>
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 5 }}>{error}</div>}
      {helper && !helperTop && !error && <div style={{ color: "var(--ink-mute)", marginTop: 8, lineHeight: 1.45, fontSize: 12 }}>{helper}</div>}
    </div>
  );
}

/* ──────────────── Badge ──────────────── */
export function Badge({ status, children }: { status: string; children: ReactNode }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "#DCFCE7", color: "#16A34A" },
    "active-live": { bg: "#DCFCE7", color: "#16A34A" },
    "active-ready": { bg: "#FEF3C7", color: "#D97706" },
    active_live: { bg: "#DCFCE7", color: "#16A34A" },
    active_ready: { bg: "#FEF3C7", color: "#D97706" },
    draft: { bg: "#F3F4F6", color: "#6B7280" },
    ended: { bg: "#DBEAFE", color: "#3B82F6" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color,
      borderRadius: 999, padding: "4px 12px",
      fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

/* ──────────────── Spinner ──────────────── */
export function Spinner({ size = 20, color = "var(--mint-500)" }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2.5px solid ${color}30`, borderTopColor: color,
      borderRadius: "50%", animation: "spin .7s linear infinite",
    }} />
  );
}

/* ──────────────── SectionCard ──────────────── */
export function SectionCard({ title, subtitle, children, style }: { title?: string; subtitle?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 18, boxShadow: "var(--shadow-card)", ...style }}>
      {title && (
        <div style={{ padding: "22px 26px 0" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
          {subtitle && <div style={{ color: "var(--ink-mute)", marginTop: 4, lineHeight: 1.45, fontSize: 14 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: title ? "20px 26px 24px" : "24px 26px" }}>{children}</div>
    </div>
  );
}

/* ──────────────── PreviewFrame ──────────────── */
// Wraps a live preview in a visually distinct "tray" — a tinted, dashed-edge
// panel with an eyebrow label — so it reads as a non-interactive preview of
// guest/display screens rather than an editable form control.
export function PreviewFrame({ label, aspect, maxWidth, fillHeight, children }: { label: string; aspect?: string; maxWidth?: number; fillHeight?: boolean; children: ReactNode }) {
  return (
    <div style={fillHeight ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>
      <div style={{ background: "var(--surface-2)", borderRadius: 18, padding: 14, ...(fillHeight && { flex: 1, display: "flex", flexDirection: "column" }) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-mute)" }}>{label}</span>
        </div>
        {aspect ? (
          <div style={fillHeight ? {
            position: "relative", height: "100%", width: "auto", maxWidth: "100%", margin: "0 auto",
            aspectRatio: aspect, borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-card)",
            containerType: "inline-size", flex: 1,
          } : {
            position: "relative", width: "100%", maxWidth, margin: maxWidth ? "0 auto" : undefined,
            aspectRatio: aspect, borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-card)",
            containerType: "inline-size",
          }}>
            {children}
          </div>
        ) : (
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: "18px 22px", boxShadow: "var(--shadow-card)" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────── EmptyImage ──────────────── */
// Shown in place of a background photo when no image has been uploaded yet —
// scales with cqw so it matches the host card's sizing.
function EmptyImage() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
      backgroundSize: "2.4cqw 2.4cqw", backgroundPosition: "0 0, 0 1.2cqw, 1.2cqw -1.2cqw, -1.2cqw 0",
      backgroundColor: "#fff",
    }} />
  );
}

/* ──────────────── FormCard ──────────────── */
export function FormCard({ children, maxWidth = 420 }: { children: ReactNode; maxWidth?: number }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line-soft)",
      borderRadius: isMobile ? 18 : 22,
      boxShadow: "var(--shadow-raised)",
      padding: isMobile ? "28px 22px" : "38px 34px",
      width: "100%", maxWidth, boxSizing: "border-box",
    }}>{children}</div>
  );
}

/* ──────────────── Modal ──────────────── */
export function Modal({
  title, body, onCancel, onConfirm, confirmText = "Confirm", danger, open = true,
}: {
  title: string; body: ReactNode; onCancel: () => void; onConfirm: () => void;
  confirmText?: string; danger?: boolean; open?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.38)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 400, boxShadow: "var(--shadow-float)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 24 }}>{body}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── CopyableField ──────────────── */
export function CopyableField({ value, label, onOpen, onSave }: { value: string; label?: string; onOpen?: () => void; onSave?: () => void }) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  if (isMobile) {
    return (
      <div>
        {label && <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 7 }}>{label}</div>}
        <div style={{ height: 44, borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", marginBottom: 8 }}>
          <input readOnly value={value} style={{ flex: 1, border: 0, outline: 0, background: "transparent", padding: "0 12px", fontSize: 13, color: "var(--ink-soft)" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onSave && <button onClick={onSave} style={cellBtn(false)}>Save QR</button>}
          {onOpen && <button onClick={onOpen} style={cellBtn(false)}>Open link</button>}
          <button onClick={copy} style={cellBtn(copied)}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      {label && <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 7 }}>{label}</div>}
      <div style={{ display: "flex", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden", height: 48 }}>
        <input readOnly value={value} style={{ flex: 1, border: 0, outline: 0, background: "transparent", padding: "0 14px", fontSize: 13, color: "var(--ink-soft)" }} />
        {onSave && <button onClick={onSave} style={inlineBtn(false)}>Save QR</button>}
        {onOpen && <button onClick={onOpen} style={inlineBtn(false)}>Open link</button>}
        <button onClick={copy} style={inlineBtn(copied)}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
    </div>
  );
}
const inlineBtn = (active: boolean): CSSProperties => ({
  padding: "0 16px", border: 0, borderLeft: "1px solid var(--line)",
  background: active ? "#DCFCE7" : "var(--canvas)",
  color: active ? "#16A34A" : "var(--ink-soft)", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
});
const cellBtn = (active: boolean): CSSProperties => ({
  flex: 1, height: 40, border: "1px solid var(--line)", borderRadius: 10,
  background: active ? "#DCFCE7" : "var(--canvas)",
  color: active ? "#16A34A" : "var(--ink-soft)", fontSize: 13, cursor: "pointer", fontWeight: 500,
});

/* ──────────────── PlannerLayout ──────────────── */
export function PlannerLayout({ children, userEmail, onLogout, onLogoClick, hideHeader }: {
  children: ReactNode; userEmail?: string;
  onLogout?: () => void; onLogoClick?: () => void; hideHeader?: boolean;
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)" }}>
      {!hideHeader && (
        <header style={{
          height: 56, background: "var(--surface)", borderBottom: "1px solid var(--line-soft)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ maxWidth: 800, margin: "0 auto", height: "100%", padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Logo size={16} onClick={onLogoClick} />
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
              {!isMobile && userEmail && <span style={{ fontSize: 13, color: "var(--mint-500)" }}>{userEmail}</span>}
              <button onClick={onLogout} style={{
                fontSize: 13, color: "var(--ink-soft)", background: "none",
                border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer",
                padding: "5px 14px", fontFamily: "var(--font-ui)", fontWeight: 500,
              }}>Log out</button>
            </div>
          </div>
        </header>
      )}
      <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>{children}</div>
    </div>
  );
}

/* ──────────────── UploadZone ──────────────── */
export function UploadZone({
  label, helper, previewUrl, onUpload, onRemove, uploading, aspect = "16/9", scale = "width", height = "50vh", fit = "cover",
}: {
  label?: string; helper?: string; previewUrl?: string | null;
  onUpload: (file: File) => void; onRemove?: () => void;
  uploading?: boolean; aspect?: string; scale?: "width" | "height" | "natural" | "natural-height"; height?: string; fit?: "cover" | "contain";
}) {
  const [drag, setDrag] = useState(false);
  const inputId = `upload-${label?.replace(/\s+/g, "-") || Math.random()}`;

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onUpload(f);
  };

  // "width": fills the available width, height follows the aspect ratio.
  // "height": fixed height, width follows the aspect ratio (capped at 100%).
  // "natural": fixed square (height x height) when empty; once an image is
  //   uploaded, the box sizes to the image's own aspect ratio, capped at
  //   height x height — i.e. never crops.
  // "natural-height": fixed `aspect` box at `height` when empty; once an
  //   image is uploaded, the box sizes to the image's own aspect ratio,
  //   capped at height (vertically) and 100% of the container (horizontally)
  //   — i.e. never crops, and shrinks below `height` for very wide images.
  // Empty and preview states share this sizing, so they're always the same size.
  const boxStyle: CSSProperties =
    scale === "natural" ? { height, width: height } :
    scale === "height" || scale === "natural-height" ? { aspectRatio: aspect, height, maxWidth: "100%" } :
    { aspectRatio: aspect, width: "100%" };
  const wrapperStyle: CSSProperties = scale !== "width" ? { width: "fit-content", maxWidth: "100%" } : {};

  return (
    <div>
      {label && <div style={{ color: "var(--ink)", display: "flex", alignItems: "center", height: 24, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>}
      {helper && <div style={{ color: "var(--ink-mute)", marginBottom: 10, lineHeight: 1.5, fontSize: 14 }}>{helper}</div>}

      {previewUrl ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", ...wrapperStyle }}>
          <label htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            style={{ display: "block", cursor: uploading ? "wait" : "pointer", outline: drag ? "2px dashed var(--mint-500)" : "none", outlineOffset: -2 }}>
            {scale === "natural" ? (
              <img src={previewUrl} alt="" style={{ display: "block", maxWidth: height, maxHeight: height, width: "auto", height: "auto", background: "var(--surface-2)" }} />
            ) : scale === "natural-height" ? (
              <img src={previewUrl} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: height, width: "auto", height: "auto", background: "var(--surface-2)" }} />
            ) : (
              <div style={{ ...boxStyle, background: "var(--surface-2)" }}>
                <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }} />
              </div>
            )}
          </label>
          {onRemove && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} disabled={uploading} title="Remove"
              style={{
                position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%",
                border: "none", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 16, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
              ×
            </button>
          )}
          {uploading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              Uploading…
            </div>
          )}
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} disabled={uploading} />
        </div>
      ) : (
        <div style={wrapperStyle}>
          <label htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            style={{
              ...boxStyle, borderRadius: 12,
              border: `2px dashed ${drag ? "var(--mint-500)" : "var(--line)"}`,
              background: drag ? "rgba(92,201,167,.05)" : "var(--surface-2)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
              cursor: uploading ? "wait" : "pointer", transition: "all .14s",
              textAlign: "center", padding: "12px 16px",
            }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, lineHeight: 1.4 }}>
              {uploading ? "Uploading…" : (
                <>Drop image here or click to <span style={{ color: "var(--coral)", fontWeight: 600 }}>browse file</span></>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-mute)", lineHeight: 1.4 }}>JPG, PNG, WebP · max 10MB</div>
            <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} disabled={uploading} />
          </label>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Test mode (active_ready) indicators ──────────────── */
// Shown on the guest upload page and display screen while an event is
// active_ready (paid but not yet live) — same wording and layout on both.

// In-flow banner — place at the top of the page layout so it pushes content
// down instead of covering it.
export function TestModeBanner() {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 9001, background: "#FF7A59", backdropFilter: "blur(6px)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: "var(--font-thai)", fontSize: 14, fontWeight: 700, color: "#fff", textAlign: "center" }}>ยังไม่ได้เริ่มไลฟ์ — กด Start Live เพื่อนำลายน้ำออก</span>
    </div>
  );
}

/* ──────────────── Display idle screen ──────────────── */
// Shared between the live /display/[id] idle state and the Event Settings
// preview, so the two never visually drift apart.
export function IdleCard({ accent, font, bg, eventName, eventId, previewEmpty }: { accent: string; font: string; bg: string | null; eventName: string; eventId: string; previewEmpty?: boolean }) {
  const guestUrl = typeof window !== "undefined" ? `${location.origin}/upload/${eventId}` : "";
  // QR code generated client-side via a free QR API.
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}`;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", background: "#111" }}>
      <div style={{ position: "relative", width: "62%", overflow: "hidden" }}>
        {bg ? (
          <img src={bg} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenBurns 24s ease-in-out infinite" }} />
        ) : previewEmpty ? (
          <EmptyImage />
        ) : (
          <img src="/photos/couple-idle.jpg" alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", animation: "kenBurns 24s ease-in-out infinite" }} />
        )}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, background: "linear-gradient(to right, transparent, #F2F1EF)", width: "11.5cqw" }} />
      </div>
      <div style={{ flex: 1, background: "#F2F1EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "2.7cqw 2.7cqw 2.3cqw" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font, fontSize: "2.4cqw", fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, ...gradientText(accent) }}>
            {eventName}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.15cqw" }}>
          <div style={{ fontFamily: font, color: "var(--ink)", fontSize: "1.1cqw" }}>สแกนเพื่อแชร์ช่วงเวลาของคุณ</div>
          <div style={{ width: "12.7cqw", aspectRatio: "1", background: accent, borderRadius: "1.15cqw", padding: "0.13cqw", boxShadow: "0 16px 48px rgba(0,0,0,.10)" }}>
            <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: "1cqw", padding: "0.94cqw", boxSizing: "border-box" }}>
              <img src={qrSrc} alt="QR" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, background: "#fff", borderRadius: "0.83cqw", border: "1px solid var(--line-soft)", overflow: "hidden", width: "100%" }}>
          {[{ n: "1", t: "สแกน QR" }, { n: "2", t: "เลือกรูป" }, { n: "3", t: "ขึ้นจอใหญ่" }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "0.83cqw 0.625cqw", textAlign: "center", borderRight: i < 2 ? "1px solid var(--line-soft)" : "none" }}>
              <div style={{ width: "1.46cqw", height: "1.46cqw", borderRadius: 999, background: accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.42cqw", color: "#fff", fontSize: "0.625cqw", fontWeight: 800 }}>{s.n}</div>
              <div style={{ fontFamily: font, fontSize: "0.68cqw", color: "var(--ink)", fontWeight: 600 }}>{s.t}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.365cqw" }}>
          <img src="/assets/sparkle-mint.svg" alt="" style={{ width: "0.73cqw", height: "0.73cqw" }} />
          <span style={{ fontSize: "0.68cqw", fontWeight: 700, color: "var(--ink-mute)" }}>WeddingTech</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Display live wall ──────────────── */
// A non-interactive preview of the /display/[id] "live wall" state —
// shows a sample guest post styled with the event's accent + font, sized
// with cqw units relative to the original 1920px-wide display layout.
// Logo height as a fraction of the live wall's cqw unit, keyed by the
// organizer-facing S/M/L/XL size options (S matches the original size).
export const LOGO_SIZE_CQW: Record<LogoSize, number> = { S: 8, M: 12, L: 16 };
// Same scale in px, for the fixed-size /display page (1920px-wide reference).
export const LOGO_SIZE_PX: Record<LogoSize, number> = { S: 154, M: 230, L: 307 };

export function LiveWallCard({ accent, photo, logo, logoSize = "M", guestName, message, previewEmpty }: { accent: string; photo: string | null; logo?: string | null; logoSize?: LogoSize; guestName: string; message: string; previewEmpty?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      {photo ? (
        <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : previewEmpty ? (
        <EmptyImage />
      ) : (
        <img src="/photos/event-hero.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, rgba(0,0,0,.3) 15%, transparent 30%)" }} />
      {logo && (
        <div style={{ position: "absolute", top: "1.875cqw", right: "1.875cqw" }}>
          <img src={logo} alt="" style={{ height: `${LOGO_SIZE_CQW[logoSize]}cqw`, maxWidth: "25cqw", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,.4))" }} />
        </div>
      )}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 3.125cqw 2.71cqw" }}>
        <div style={{
          fontSize: "4.17cqw", fontWeight: 800, ...gradientText(accent),
          letterSpacing: "-.02em", marginBottom: "0.73cqw", lineHeight: 1,
          ...(accent.includes("gradient")
            ? { filter: "drop-shadow(0 2px 10px rgba(0,0,0,.45))" }
            : { textShadow: "0 2px 10px rgba(0,0,0,.45)" }),
        }}>
          {guestName}
        </div>
        <div style={{ fontSize: "2.19cqw", fontWeight: 400, color: "rgba(255,255,255,.92)", maxWidth: "65%", lineHeight: 1.4, textShadow: "0 1px 10px rgba(0,0,0,.5)" }}>
          {message}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "1.15cqw", right: "1.46cqw", display: "flex", alignItems: "center", gap: "0.42cqw", color: "rgba(255,255,255,.45)", fontSize: "0.78cqw", fontWeight: 700, fontFamily: "var(--font-ui)" }}>
        <img src="/assets/sparkle-mint.svg" alt="" style={{ width: "0.83cqw", height: "0.83cqw", opacity: 0.55, filter: "brightness(0) invert(1)" }} />
        WeddingTech
      </div>
      <div style={{ position: "absolute", bottom: "1.15cqw", left: "3.125cqw", color: "rgba(255,255,255,.4)", fontSize: "0.73cqw", fontWeight: 600, fontFamily: "var(--font-ui)" }}>
        1 / 3
      </div>
    </div>
  );
}

/* ──────────────── Guest upload page header ──────────────── */
// A non-interactive preview of the /upload/[id] hero + title block —
// shared visual reference for the Event Settings preview, sized with
// cqw units relative to the original 420px-wide mobile layout.
export function GuestPreviewCard({ accent, font, bg, eventName, eventDate, previewEmpty }: { accent: string; font: string; bg: string | null; eventName: string; eventDate: string | null; previewEmpty?: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--canvas)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "relative", height: "70%", flexShrink: 0, overflow: "hidden" }}>
        {bg ? (
          <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : previewEmpty ? (
          <EmptyImage />
        ) : (
          <img src="/photos/event-hero.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "3.8cqw 4.8cqw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.7cqw", fontSize: "3.1cqw", fontWeight: 700, color: "rgba(255,255,255,.85)" }}>
            <img src="/assets/sparkle-mint.svg" alt="" style={{ width: "3.3cqw", height: "3.3cqw", filter: "brightness(0) invert(1)", opacity: 0.8 }} />
            WeddingTech
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,.18)", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,.4)" }}>
            {(["TH", "EN"] as const).map((l) => (
              <div key={l} style={{
                padding: "1.2cqw 3.3cqw", fontSize: "2.86cqw", fontWeight: 700,
                background: l === "TH" ? "rgba(255,255,255,.95)" : "transparent",
                color: l === "TH" ? "var(--ink)" : "#fff",
              }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "5.2cqw 5.7cqw 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ marginBottom: "1.6cqw", fontSize: "3.6cqw", color: "var(--ink-soft)" }}>ยินดีต้อนรับเข้าสู่งานแต่งงานของ</div>
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: "6.7cqw", marginBottom: "2.1cqw", lineHeight: 1.1, ...gradientText(accent) }}>{eventName}</div>
        {eventDate && <div style={{ color: "var(--ink-soft)", fontSize: "3.1cqw", marginBottom: "3.1cqw" }}>{eventDate}</div>}
        <div style={{ background: "var(--line)", height: "0.5cqw", width: "100%", margin: "8.2cqw 0" }} />
        <div style={{ fontFamily: font, fontWeight: 800, fontSize: "5.4cqw", ...gradientText(accent) }}>ส่งความรู้สึกดีๆให้บ่าวสาว</div>
      </div>
    </div>
  );
}

// Full-screen diagonal "PREVIEW" texture — decorative, sits above all content.
export function TestModeDiagonalOverlay() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9000, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: -400, transform: "rotate(-30deg)", display: "flex", flexDirection: "column", gap: 64 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 56, whiteSpace: "nowrap", opacity: 0.3 }}>
            {Array.from({ length: 7 }).map((_, j) => (
              <span key={j} style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase" }}>ยังไม่เริ่มไลฟ์ · PREVIEW</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
