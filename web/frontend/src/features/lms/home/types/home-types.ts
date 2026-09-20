import type { ReactNode } from "react";
import type { DashboardSummary } from "@/features/lms/circulations/types/circulation-transaction-types";
import type { TimestampLike } from "@/features/lms/home/api/home-helpers";

export type { DashboardSummary };

export interface Announcement {
  id: string;
  Subject?: string;
  Message?: string;
  AuthorName?: string;
  CreatedOn?: TimestampLike;
  ModifiedBy?: string;
  ModifiedOn?: TimestampLike;
  Files?: { URL?: string; Name?: string; name?: string }[];
  Replies?: unknown[];
}

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: ReactNode;
  to?: string;
  onSelect?: () => void;
  role?: "Checkin" | "Checkout" | "ApproveRenewals";
}

export interface StatTile {
  id: string;
  label: string;
  value: number | undefined;
  icon: ReactNode;
  to: string;
  linkLabel: string;
}
