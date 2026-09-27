import { describe, expect, it } from "vitest";
import { translations } from "../packages/i18n";
import { languageCodes, resolveLanguage } from "../packages/i18n/languages";
import { emptySnapshot, snapshotSchema } from "../packages/domain/model";

describe("supported languages", () => {
  for (const code of languageCodes) {
    it(`${code} has complete translations and preserves interpolation parameters`, () => {
      const dictionary = translations[code];
      expect(Object.keys(dictionary).sort()).toEqual(
        Object.keys(translations.en).sort(),
      );
      for (const key of Object.keys(
        translations.en,
      ) as (keyof typeof translations.en)[]) {
        expect(dictionary[key].trim(), `${code}.${key}`).not.toBe("");
        expect(
          dictionary[key].match(/\{\{\w+\}\}/g)?.sort() ?? [],
          `${code}.${key}`,
        ).toEqual(translations.en[key].match(/\{\{\w+\}\}/g)?.sort() ?? []);
      }
      const data = emptySnapshot();
      data.preferences.language = code;
      expect(
        snapshotSchema.parse(JSON.parse(JSON.stringify(data))).preferences
          .language,
      ).toBe(code);
    });
  }
  it("safely handles unsupported stored language values", () => {
    expect(resolveLanguage("it")).toBe("it");
    expect(resolveLanguage("unknown")).toBe("es");
    expect(resolveLanguage(null)).toBe("es");
  });
});
