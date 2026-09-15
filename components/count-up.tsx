"use client";

import { useEffect, useRef } from "react";

export function CountUp({
  to,
  prefix = "",
  suffix = "",
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = (v: number) => {
      el.textContent = prefix + v.toLocaleString("en-IN") + suffix;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.disconnect();
        const start = performance.now();
        const dur = 1100;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          render(Math.round(to * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix + to.toLocaleString("en-IN") + suffix}
    </span>
  );
}
