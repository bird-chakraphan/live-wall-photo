// Formats a remaining-time duration for payment-expiry messaging — Omise's
// PromptPay charges can stay valid for hours, so collapse to "X ชม. Y นาที"
// once we're past the minute-and-seconds range.
export function formatRemaining(seconds: number) {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ชม. ${minutes} นาที`;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} นาที`;
}
