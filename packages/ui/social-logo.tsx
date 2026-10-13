import { Globe } from "lucide-react";
import icons from "./social-brand-icons.json";
import type { SocialPlatform } from "../domain/social";

export function SocialLogo({ platform }: { platform: SocialPlatform }) {
  if (platform === "other") return <Globe size={22} aria-hidden="true" />;
  const icon = icons[platform];
  return (
    <svg
      width="22"
      height="22"
      viewBox={icon.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={icon.path} />
    </svg>
  );
}
