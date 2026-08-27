import { useCallback, useRef, useState } from "react";

/** Responsive chart width via ResizeObserver — recharts needs an explicit px
 * width. Uses a callback ref so it measures whenever the chart node mounts,
 * including after a loading state (an effect-on-mount would miss that and leave
 * the width stuck at 0). */
export function useChartWidth() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return { containerRef, width };
}
