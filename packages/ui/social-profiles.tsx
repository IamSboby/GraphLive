"use client";
import { Plus, Globe, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  socialPlatforms,
  socialUrl,
  type SocialProfile,
  type SocialPlatform,
} from "../domain/social";
import { Field } from "./primitives";
import { SocialLogo } from "./social-logo";
export function SocialProfiles({
  value,
  onChange,
}: {
  value: SocialProfile[];
  onChange: (value: SocialProfile[]) => void;
}) {
  const { t } = useTranslation();
  const update = (index: number, patch: Partial<SocialProfile>) =>
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  return (
    <section className="social-editor" aria-label={t("socialProfiles")}>
      <header>
        <h3>
          <Globe size={18} />
          {t("socialProfiles")}
        </h3>
        <button
          type="button"
          disabled={value.length >= 20}
          onClick={() =>
            onChange([...value, { platform: "Instagram", label: "", url: "" }])
          }
        >
          <Plus size={17} />
          {t("addSocialProfile")}
        </button>
      </header>
      {value.map((profile, i) => (
        <div className="social-editor-row" key={i}>
          <span className="social-editor-logo">
            <SocialLogo platform={profile.platform} />
          </span>
          <Field label={t("socialPlatform")}>
            <select
              value={profile.platform}
              onChange={(e) =>
                update(i, { platform: e.target.value as SocialPlatform })
              }
            >
              {socialPlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform === "other" ? t("otherSocial") : platform}
                </option>
              ))}
            </select>
          </Field>
          {profile.platform === "other" && (
            <Field label={t("socialName")}>
              <input
                required
                maxLength={80}
                value={profile.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </Field>
          )}
          <Field label={t("socialAddress")}>
            <input
              required
              maxLength={2048}
              autoCapitalize="none"
              autoCorrect="off"
              value={profile.url}
              onChange={(e) => update(i, { url: e.target.value })}
              onBlur={() =>
                update(i, { url: socialUrl(profile.platform, profile.url) })
              }
            />
          </Field>
          <button
            type="button"
            className="icon-button"
            aria-label={t("removeSocialProfile", {
              name:
                profile.platform === "other" ? profile.label : profile.platform,
            })}
            onClick={() => onChange(value.filter((_, index) => i !== index))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </section>
  );
}
