"use client";

import * as React from "react";
import { useFeatureTips } from "./feature-tips-provider";
import { getTipDefinition } from "@/lib/feature-tips/config";

type FeatureTipProps = {
  /** Must match an entry in the central feature-tips config. */
  tipId: string;
  children: React.ReactNode;
};

/**
 * Wraps a single element (button, link, etc.) and registers the associated
 * feature tip target with the global FeatureTipsProvider. The tip itself is
 * rendered once, positioned near this element, and never re-shown after the
 * user dismisses it.
 */
export function FeatureTip({ tipId, children }: FeatureTipProps) {
  const { registerTip } = useFeatureTips();
  const targetRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const definition = getTipDefinition(tipId);
    if (!definition) {
      return;
    }
    return registerTip({
      tipId,
      def: definition,
      getTarget: () => targetRef.current,
    });
  }, [tipId, registerTip]);

  let content: React.ReactNode;
  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<{ ref?: unknown }>;
    const originalRef = child.props.ref as
      | ((instance: HTMLElement | null) => void)
      | React.RefObject<HTMLElement>
      | undefined;
    const attachedRef: React.Ref<HTMLElement> = (node) => {
      targetRef.current = node;
      if (typeof originalRef === "function") {
        originalRef(node);
      } else if (originalRef) {
        // Forward the attach/detach to the caller-provided ref object. The
        // write happens at commit time (ref callback), never during render.
        // eslint-disable-next-line react-hooks/immutability
        (originalRef as { current: HTMLElement | null }).current = node;
      }
    };
    content = React.cloneElement(
      child,
      { ref: attachedRef } as React.RefAttributes<HTMLElement>,
    );
  } else {
    content = (
      <span ref={(node) => { targetRef.current = node; }}>{children}</span>
    );
  }

  return <>{content}</>;
}