export const backupPolicy = {
  automaticLimit: 20,
  intervalMs: 15 * 60 * 1000,
  legacyKeep: 20,
};
export function backupTime(title: string) {
  const match =
    /^(?:(?:auto|manual)-)?backup-(\d{13})-[0-9a-f-]{36}(?:\.json)?$/i.exec(
      title,
    );
  return match ? Number(match[1]) : 0;
}
export function isAutomaticBackup(title: string) {
  return title.startsWith("auto-backup-") && backupTime(title) > 0;
}
export function isLegacyBackup(title: string) {
  return title.startsWith("backup-") && backupTime(title) > 0;
}
export function needsAutomaticBackup(titles: string[], now = Date.now()) {
  const latest = Math.max(0, ...titles.map(backupTime));
  return latest === 0 || now - latest >= backupPolicy.intervalMs;
}
