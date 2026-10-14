export const languageCodes = ["en", "es", "it", "de", "fr", "pt"] as const;
export type Language = (typeof languageCodes)[number];
export const languageNames: Record<Language, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
};
export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" && languageCodes.some((code) => code === value)
  );
}
export function resolveLanguage(value: unknown): Language {
  return isLanguage(value) ? value : "en";
}
