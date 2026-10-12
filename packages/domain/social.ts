import { z } from "zod";
export const socialPlatforms = [
  "Instagram",
  "TikTok",
  "X",
  "Facebook",
  "LinkedIn",
  "YouTube",
  "Twitch",
  "GitHub",
  "Bluesky",
  "Discord",
  "Telegram",
  "WhatsApp",
  "Snapchat",
  "other",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export function socialUrl(platform: SocialPlatform, value: string) {
  const raw = value.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes(":") || raw.startsWith("//")) return raw;
  const name = encodeURIComponent(raw.replace(/^@/, ""));
  const base: Partial<Record<SocialPlatform, string>> = {
    Instagram: "https://www.instagram.com/",
    TikTok: "https://www.tiktok.com/@",
    X: "https://x.com/",
    Facebook: "https://www.facebook.com/",
    LinkedIn: "https://www.linkedin.com/in/",
    YouTube: "https://www.youtube.com/@",
    Twitch: "https://www.twitch.tv/",
    GitHub: "https://github.com/",
    Bluesky: "https://bsky.app/profile/",
    Telegram: "https://t.me/",
    Snapchat: "https://www.snapchat.com/add/",
  };
  if (platform === "WhatsApp" && /^\+?[\d\s()-]+$/.test(raw))
    return "https://wa.me/" + raw.replace(/\D/g, "");
  return base[platform] ? base[platform] + name : raw;
}
export const socialProfileSchema = z
  .object({
    platform: z.enum(socialPlatforms),
    label: z.string().trim().max(80).default(""),
    url: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => {
        try {
          return ["https:", "http:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      }, "url"),
  })
  .strict()
  .refine((p) => p.platform !== "other" || Boolean(p.label), "socialName");
export type SocialProfile = z.infer<typeof socialProfileSchema>;
