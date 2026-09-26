import { describe, expect, it } from "vitest";
import { emptySnapshot, snapshotSchema } from "../packages/domain/model";
import {
  relationshipPalette,
  relationshipFileSchema,
  themePalette,
  themeFileSchema,
} from "../packages/appearance/config";
import {
  needsAutomaticBackup,
  isAutomaticBackup,
  isLegacyBackup,
  backupPolicy,
} from "../packages/storage-core/backup-policy";

describe("appearance compatibility", () => {
  it("opens existing networks and preserves custom colors through serialization", () => {
    const data = emptySnapshot();
    expect(relationshipPalette(data.preferences).friend).toBe("#D9B94E");
    data.preferences.relationshipColors = { friend: "#123456" };
    data.preferences.themePreset = "forest";
    data.preferences.customThemes = { dark: { bg: "#010203" } };
    const reopened = snapshotSchema.parse(JSON.parse(JSON.stringify(data)));
    expect(relationshipPalette(reopened.preferences).friend).toBe("#123456");
    expect(themePalette(reopened.preferences, true).bg).toBe("#010203");
    expect(themePalette(reopened.preferences, false).bg).toBe("#f3f8f5");
  });
  it("validates complete portable palettes and rejects unsafe or incomplete values", () => {
    const colors = relationshipPalette();
    expect(
      relationshipFileSchema.parse({ schemaVersion: 1, colors }).colors,
    ).toEqual(colors);
    expect(
      relationshipFileSchema.safeParse({
        schemaVersion: 1,
        colors: { friend: "red" },
      }).success,
    ).toBe(false);
    expect(
      themeFileSchema.safeParse({
        schemaVersion: 1,
        light: themePalette(undefined, false),
        dark: themePalette(undefined, true),
      }).success,
    ).toBe(true);
    expect(
      themeFileSchema.safeParse({ schemaVersion: 1, light: { bg: "url(x)" } })
        .success,
    ).toBe(false);
  });
});

describe("backup scheduling", () => {
  const now = 1790000000000;
  const title = `auto-backup-${now}-00000000-0000-0000-0000-000000000000`;
  it("uses persisted timestamps across sessions and the fifteen minute boundary", () => {
    expect(needsAutomaticBackup([], now)).toBe(true);
    expect(
      needsAutomaticBackup([title], now + backupPolicy.intervalMs - 1),
    ).toBe(false);
    expect(needsAutomaticBackup([title], now + backupPolicy.intervalMs)).toBe(
      true,
    );
  });
  it("does not classify manual or unrelated files as automatic or legacy", () => {
    expect(isAutomaticBackup(title)).toBe(true);
    expect(isLegacyBackup(title.replace("auto-", ""))).toBe(true);
    for (const value of [
      title.replace("auto-", "manual-"),
      "graphlive-network.json",
      "backup-unknown",
    ]) {
      expect(isAutomaticBackup(value)).toBe(false);
      expect(isLegacyBackup(value)).toBe(false);
    }
  });
});
