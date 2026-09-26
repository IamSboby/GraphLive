"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  appearanceSchema,
  relationshipTypes,
  relationshipPalette,
  relationshipFileSchema,
  themeFileSchema,
  themePalette,
  themeNames,
  themeKeys,
  type Appearance,
} from "../appearance/config";
import { useNetwork } from "./store";
import { Field } from "./primitives";
import { download } from "../storage-core/export";
export function AppearanceSettings() {
  const s = useNetwork(),
    { t } = useTranslation();
  const [draft, setDraft] = useState<Appearance>(() =>
    appearanceSchema.parse(s.data!.preferences),
  );
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [error, setError] = useState("");
  const colors = relationshipPalette(draft),
    palette = themePalette(draft, mode === "dark");
  const busy = s.saving || s.dirty || Boolean(s.conflict);
  async function importConfig(file: File, kind: "colors" | "theme") {
    try {
      if (file.size > 65536) throw Error("tooLarge");
      const json = JSON.parse(await file.text());
      if (kind === "colors") {
        const importedColors = relationshipFileSchema.parse(json).colors;
        setDraft((d) => ({
          ...d,
          relationshipColors: importedColors,
        }));
      } else {
        const theme = themeFileSchema.parse(json);
        setDraft((d) => ({
          ...d,
          customThemes: { light: theme.light, dark: theme.dark },
        }));
      }
      setError("");
    } catch {
      setError("appearanceInvalid");
    }
  }
  return (
    <details className="appearance-settings">
      <summary>{t("appearanceEditor")}</summary>
      <p className="muted-copy">{t("appearanceHelp")}</p>
      <fieldset disabled={busy}>
        <h3>{t("connectionColors")}</h3>
        <div className="color-grid">
          {relationshipTypes.map((key) => (
            <label key={key}>
              <input
                aria-label={t(key)}
                type="color"
                value={colors[key]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    relationshipColors: {
                      ...d.relationshipColors,
                      [key]: e.target.value,
                    },
                  }))
                }
              />
              <span>{t(key)}</span>
            </label>
          ))}
        </div>
        <div className="action-grid">
          <button
            onClick={() =>
              download(
                JSON.stringify({ schemaVersion: 1, colors }, null, 2),
                "relationship-colors.json",
              )
            }
          >
            {t("exportColors")}
          </button>
          <label className="button file-button">
            {t("importColors")}
            <input
              type="file"
              accept=".json"
              aria-label={t("importColors")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importConfig(file, "colors");
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <h3>{t("themeEditor")}</h3>
        <Field label={t("themePreset")}>
          <select
            value={draft.themePreset ?? "classic"}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                themePreset: e.target.value as Appearance["themePreset"],
                customThemes: undefined,
              }))
            }
          >
            {themeNames.map((name) => (
              <option key={name} value={name}>
                {t("theme_" + name)}
              </option>
            ))}
          </select>
        </Field>
        <div
          className="theme-preview"
          style={{
            background: palette.bg,
            color: palette.text,
            borderColor: palette.border,
          }}
        >
          <span
            className="owner-preview"
            style={{
              background: `linear-gradient(135deg,${palette.ownerStart},${palette.ownerEnd})`,
            }}
          />
          <div>
            <strong>{t("me")}</strong>
            <p>{t("appearancePreview")}</p>
          </div>
          <span
            className="theme-preview-accent"
            style={{ background: palette.accent, color: palette.surface }}
          >
            Aa
          </span>
        </div>
        <details>
          <summary>{t("themeAdvanced")}</summary>
          <Field label={t("themeVariant")}>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="light">{t("light")}</option>
              <option value="dark">{t("dark")}</option>
            </select>
          </Field>
          <div className="color-grid">
            {themeKeys.map((key) => (
              <label key={key}>
                <input
                  type="color"
                  aria-label={t("themeColor_" + key)}
                  value={palette[key]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      customThemes: {
                        ...d.customThemes,
                        [mode]: {
                          ...d.customThemes?.[mode],
                          [key]: e.target.value,
                        },
                      },
                    }))
                  }
                />
                <span>{t("themeColor_" + key)}</span>
              </label>
            ))}
          </div>
        </details>
        <div className="action-grid">
          <button
            onClick={() =>
              download(
                JSON.stringify(
                  {
                    schemaVersion: 1,
                    light: themePalette(draft, false),
                    dark: themePalette(draft, true),
                  },
                  null,
                  2,
                ),
                "themes.json",
              )
            }
          >
            {t("exportTheme")}
          </button>
          <label className="button file-button">
            {t("importTheme")}
            <input
              type="file"
              accept=".json"
              aria-label={t("importTheme")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importConfig(file, "theme");
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <footer className="modal-actions">
          <button onClick={() => setDraft({})}>{t("resetAppearance")}</button>
          <button
            className="primary"
            onClick={() =>
              s.mutate((d) => {
                d.preferences.relationshipColors = draft.relationshipColors;
                d.preferences.themePreset = draft.themePreset;
                d.preferences.customThemes = draft.customThemes;
              })
            }
          >
            {t("applyAppearance")}
          </button>
        </footer>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </details>
  );
}
