const locales: Record<string, string> = {
  es: "es-ES",
  en: "en-US",
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
  pt: "pt-PT",
};
/** Formats presentation only; stored ISO values are never modified. */
export function formatDate(
  value: string | number,
  language: string,
  withTime = false,
) {
  const plain = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(plain ? value + "T12:00:00Z" : value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locales[language] ?? language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(plain ? { timeZone: "UTC" } : {}),
    ...(withTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(date);
}
export function formatBackupDate(id: string, language: string) {
  const match = id.match(/(\d{4}-\d{2}-\d{2})T(\d{2})[-:](\d{2})[-:](\d{2})/);
  return match
    ? formatDate(
        `${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`,
        language,
        true,
      )
    : id;
}
