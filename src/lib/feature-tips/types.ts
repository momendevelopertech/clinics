import type { LucideIcon } from "lucide-react";

export type TipPlacement = "top" | "bottom" | "left" | "right";

export type FeatureTipDefinition = {
  tipId: string;
  titleKey: string;
  descKey: string;
  icon?: LucideIcon;
  /** Preferred placement; the smart positioner may flip it when space is tight. */
  placement?: TipPlacement;
  /** Determines which tip shows first when several are registered on a page. */
  order?: number;
  /** Restrict a tip to specific dashboard paths (e.g. shell-level targets). */
  paths?: string[];
};

export type VisibilityState = {
  dismissed: Record<string, number>;
  enabled: boolean;
};