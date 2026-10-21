"use client";

import { useEffect, useState } from "react";

/** Lives in the root layout: plays once per document, not on route changes. */
export function StartupAnimation() {
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(frame);
    }
    // Let the hydrated interface paint before revealing it. No network wait.
    let revealFrame = 0;
    const frame = requestAnimationFrame(() => {
      revealFrame = requestAnimationFrame(() => setPhase("leaving"));
    });
    // Also release if animationend is suppressed by the browser/user styles.
    const fallback = window.setTimeout(() => setPhase("done"), 1200);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      window.clearTimeout(fallback);
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div
      className="startup"
      data-phase={phase}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setPhase("done");
      }}
    >
      <div className="startup-brand">
        <div className="startup-halo" />
        <svg className="startup-logo" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="#335eaa" />
          <g className="startup-orbit">
            <g stroke="white" strokeWidth="3" strokeLinecap="round">
              <path className="startup-link" pathLength="1" d="M18 19L45 25" />
              <path className="startup-link" pathLength="1" d="M45 25L29 46" />
              <path className="startup-link" pathLength="1" d="M29 46L18 19" />
            </g>
            <g fill="white">
              <circle cx="18" cy="19" r="7" />
              <circle cx="45" cy="25" r="6" />
              <circle cx="29" cy="46" r="5" />
            </g>
          </g>
        </svg>
        <span className="startup-name">GraphLive</span>
      </div>
    </div>
  );
}
