import { describe, it, expect } from "vitest";
import { formatDate, formatBackupDate } from "../packages/i18n/dates";
describe("date presentation", () => {
  it("shows Spanish calendar dates without changing their day or input", () => {
    const iso = "2026-01-09";
    expect(formatDate(iso, "es")).toBe("09/01/2026");
    expect(iso).toBe("2026-01-09");
  });
  it("respects English and German conventions", () => {
    expect(formatDate("2026-01-09", "en")).toBe("01/09/2026");
    expect(formatDate("2026-01-09", "de")).toBe("09.01.2026");
  });
  it("formats backup filenames and preserves non-date identifiers", () => {
    expect(
      formatBackupDate("2026-01-09T12-00-00-000Z-test.json", "es"),
    ).toContain("09/01/2026");
    expect(formatBackupDate("manual", "es")).toBe("manual");
  });
});
