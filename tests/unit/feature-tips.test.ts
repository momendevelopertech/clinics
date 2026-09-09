import { describe, expect, it } from "vitest";
import { computeTipPosition } from "@/lib/feature-tips/position";
import { getTipDefinition } from "@/lib/feature-tips/config";

const rect = (x: number, y: number, width: number, height: number): DOMRect =>
  ({
    x,
    y,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect;

describe("computeTipPosition", () => {
  const viewport = { width: 1280, height: 800 };
  const tip = { width: 320, height: 150 };
  const centerTarget = rect(500, 300, 120, 40);

  it("places the tip above the target when preferred is top", () => {
    const result = computeTipPosition({
      targetRect: centerTarget,
      tipWidth: tip.width,
      tipHeight: tip.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      preferred: "top",
      mobile: false,
    });
    expect(result.placement).toBe("top");
    expect(result.top + tip.height).toBeLessThan(centerTarget.top);
  });

  it("falls back below when there is no room above", () => {
    const nearTop = rect(500, 8, 120, 40);
    const result = computeTipPosition({
      targetRect: nearTop,
      tipWidth: tip.width,
      tipHeight: tip.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      preferred: "top",
      mobile: false,
    });
    expect(result.placement).toBe("bottom");
    expect(result.top).toBeGreaterThan(nearTop.bottom);
  });

  it("clamps horizontal position inside the viewport", () => {
    const nearLeftEdge = rect(-60, 300, 120, 40);
    const result = computeTipPosition({
      targetRect: nearLeftEdge,
      tipWidth: tip.width,
      tipHeight: tip.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      preferred: "bottom",
      mobile: false,
    });
    expect(result.left).toBeGreaterThanOrEqual(16);
    expect(result.left + tip.width).toBeLessThanOrEqual(1280 - 16);
  });

  it("keeps the arrow within the tip's horizontal bounds", () => {
    const result = computeTipPosition({
      targetRect: centerTarget,
      tipWidth: tip.width,
      tipHeight: tip.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      preferred: "bottom",
      mobile: false,
    });
    expect(result.arrowX).toBeGreaterThanOrEqual(16);
    expect(result.arrowX).toBeLessThanOrEqual(tip.width - 16);
  });

  it("prefers side placement on desktop when vertical on both sides is tight", () => {
    const tallTarget = rect(600, 60, 40, 300);
    const result = computeTipPosition({
      targetRect: tallTarget,
      tipWidth: tip.width,
      tipHeight: tip.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      preferred: "left",
      mobile: false,
    });
    expect(["left", "right"]).toContain(result.placement);
  });

  it("never uses side placement on mobile", () => {
    const result = computeTipPosition({
      targetRect: rect(300, 400, 100, 40),
      tipWidth: 360,
      tipHeight: 150,
      viewportWidth: 375,
      viewportHeight: 667,
      preferred: "right",
      mobile: true,
    });
    expect(["top", "bottom"]).toContain(result.placement);
  });

  it("keeps the tip inside a small viewport", () => {
    const result = computeTipPosition({
      targetRect: rect(10, 20, 100, 40),
      tipWidth: 360,
      tipHeight: 150,
      viewportWidth: 375,
      viewportHeight: 667,
      preferred: "top",
      mobile: true,
    });
    expect(result.left).toBeGreaterThanOrEqual(16);
    expect(result.left).toBeLessThanOrEqual(375 - 16);
    expect(result.top).toBeGreaterThanOrEqual(16);
  });
});

describe("feature tip config registry", () => {
  const ids = [
    "shell-search",
    "patients-manage",
    "appointments-views",
    "appointments-walkin",
    "appointments-recurring",
    "waitlist-status",
    "queue-token",
    "encounters-charting",
    "billing-summary",
    "payments-status",
    "labs-ordervsresult",
    "inventory-reorder",
    "tasks-followup",
    "documents-types",
    "communications-async",
    "campaigns-audience",
    "consents-log",
    "audit-append",
    "availability-template",
    "help-reset-tips",
  ];

  it("resolves every registered tip id", () => {
    for (const id of ids) {
      const definition = getTipDefinition(id);
      expect(definition).not.toBeNull();
      expect(definition?.titleKey).toMatch(/^tip_.*_title$/);
      expect(definition?.descKey).toMatch(/^tip_.*_desc$/);
    }
  });

  it("returns null for unknown ids", () => {
    expect(getTipDefinition("does-not-exist")).toBeNull();
  });

  it("has unique tip ids", () => {
    const seen = new Map<string, number>();
    for (const id of ids) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const count of seen.values()) {
      expect(count).toBe(1);
    }
  });
});