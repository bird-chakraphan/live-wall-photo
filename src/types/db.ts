// Mirrors Supabase schema in supabase/migrations/001_init.sql

export type EventStatus = "draft" | "active_ready" | "active_live" | "ended";

export type LogoSize = "S" | "M" | "L";

export interface EventRow {
  id: string;
  account_id: string;
  name: string;
  event_date: string | null;
  status: EventStatus;
  accent_color: string;            // gradient or hex
  display_font: string;            // Prompt | Mitr | Sarabun | Charm
  post_duration_seconds: number;   // 10-30
  display_bg_url: string | null;
  guest_bg_url: string | null;
  logo_url: string | null;
  logo_size: LogoSize;
  omise_charge_id: string | null;
  omise_charge_expires_at: string | null;
  live_started_at: string | null;
  live_expires_at: string | null;
  paused: boolean;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
}

export type SubmissionStatus = "pending" | "approved" | "rejected" | "played" | "skipped";

export interface SubmissionRow {
  id: string;
  event_id: string;
  guest_name: string;
  message: string;
  photo_url: string;
  status: SubmissionStatus;
  approved_at: string | null;     // moderation gate ends 60s after approval
  played_at: string | null;
  pinned: boolean;
  moderation_reason: string | null;
  created_at: string;
}
