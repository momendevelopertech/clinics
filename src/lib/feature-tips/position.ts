import type { TipPlacement } from "./types";

export type ComputedPosition = {
  placement: TipPlacement;
  top: number;
  left: number;
  arrowX: number;
  arrowY: number;
};

export type TipPositionInput = {
  targetRect: DOMRect;
  tipWidth: number;
  tipHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  preferred: TipPlacement;
  mobile: boolean;
};

const GAP = 12;
const PADDING = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function computeTipPosition(args: TipPositionInput): ComputedPosition {
  const {
    targetRect: target,
    tipWidth,
    tipHeight,
    viewportWidth: viewportW,
    viewportHeight: viewportH,
    preferred,
    mobile,
  } = args;

  const spaceTop = target.top - GAP;
  const spaceBottom = viewportH - target.bottom - GAP;
  const spaceLeft = target.left - GAP;
  const spaceRight = viewportW - target.right - GAP;

  const primaryFit = (placement: TipPlacement) => {
    switch (placement) {
      case "top":
        return spaceTop - tipHeight;
      case "bottom":
        return spaceBottom - tipHeight;
      case "left":
        return spaceLeft - tipWidth;
      case "right":
        return spaceRight - tipWidth;
    }
  };

  const candidates: TipPlacement[] = mobile
    ? [preferred === "top" ? "top" : "bottom", preferred === "top" ? "bottom" : "top"]
    : [preferred, ...(["top", "bottom", "left", "right"] as TipPlacement[]).filter((p) => p !== preferred)];

  let chosen = candidates[0];
  for (const placement of candidates) {
    if (mobile && placement !== "top" && placement !== "bottom") {
      continue;
    }
    if (mobile) {
      const fitsHorizontal = tipWidth <= viewportW - PADDING * 2;
      if (fitsHorizontal && primaryFit(placement) >= 0) {
        chosen = placement;
        break;
      }
    } else {
      const fitsVertical = tipHeight <= viewportH - PADDING * 2;
      const sideOk =
        placement === "left" || placement === "right"
          ? fitsVertical
          : tipWidth <= viewportW - PADDING * 2;
      if (sideOk && primaryFit(placement) >= 0) {
        chosen = placement;
        break;
      }
    }
  }

  if (primaryFit(chosen) < 0) {
    chosen = (["top", "bottom", "left", "right"] as TipPlacement[])
      .filter((placement) => (mobile ? placement === "top" || placement === "bottom" : true))
      .reduce((best, placement) =>
        primaryFit(placement) > primaryFit(best) ? placement : best,
        chosen,
      );
  }

  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  let top = 0;
  let left = 0;
  let arrowX = 0;
  let arrowY = 0;

  if (chosen === "top") {
    top = target.top - GAP - tipHeight;
    left = clamp(Math.round(targetCenterX - tipWidth / 2), PADDING, viewportW - tipWidth - PADDING);
    arrowX = clamp(Math.round(targetCenterX - left), 16, tipWidth - 16);
    arrowY = tipHeight - 1;
  } else if (chosen === "bottom") {
    top = target.bottom + GAP;
    left = clamp(Math.round(targetCenterX - tipWidth / 2), PADDING, viewportW - tipWidth - PADDING);
    arrowX = clamp(Math.round(targetCenterX - left), 16, tipWidth - 16);
    arrowY = -1;
  } else if (chosen === "left") {
    left = target.left - GAP - tipWidth;
    top = clamp(Math.round(targetCenterY - tipHeight / 2), PADDING, viewportH - tipHeight - PADDING);
    arrowX = tipWidth - 1;
    arrowY = clamp(Math.round(targetCenterY - top), 16, tipHeight - 16);
  } else {
    left = target.right + GAP;
    top = clamp(Math.round(targetCenterY - tipHeight / 2), PADDING, viewportH - tipHeight - PADDING);
    arrowX = -1;
    arrowY = clamp(Math.round(targetCenterY - top), 16, tipHeight - 16);
  }

  const safeLeft = clamp(left, PADDING, Math.max(PADDING, viewportW - tipWidth - PADDING));
  const safeTop = clamp(top, PADDING, Math.max(PADDING, viewportH - tipHeight - PADDING));

  let finalArrowX = arrowX;
  let finalArrowY = arrowY;
  if (chosen === "top" || chosen === "bottom") {
    finalArrowX = clamp(Math.round(targetCenterX - safeLeft), 16, tipWidth - 16);
  } else {
    finalArrowY = clamp(Math.round(targetCenterY - safeTop), 16, tipHeight - 16);
  }

  return {
    placement: chosen,
    top: safeTop,
    left: safeLeft,
    arrowX: finalArrowX,
    arrowY: finalArrowY,
  };
}