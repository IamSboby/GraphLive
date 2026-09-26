"use client";
import type { ComponentProps } from "react";
import { Languages, Monitor, Moon, Sun } from "lucide-react";

export function IconSelect({
  kind,
  className = "",
  ...props
}: ComponentProps<"select"> & { kind: "language" | "theme" }) {
  const Icon =
    kind === "language"
      ? Languages
      : props.value === "dark"
        ? Moon
        : props.value === "light"
          ? Sun
          : Monitor;
  return (
    <div className={`icon-select ${className}`}>
      <Icon size={17} aria-hidden="true" />
      <select {...props} />
    </div>
  );
}
