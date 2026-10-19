import { describe, expect, it } from "vitest";
import { searchCountries } from "../packages/ui/country-search";

describe("country search order", () => {
  it("prioritizes Spanish name prefixes over incidental matches", () => {
    const matches = searchCountries("es", "es", []);
    expect(matches[0].code).toBe("ES");
    expect(matches.findIndex((c) => c.code === "EE")).toBeLessThan(
      matches.findIndex((c) => c.code === "AE"),
    );
  });
  it("matches accents, whitespace and exact country codes", () => {
    expect(searchCountries("es", "  MEXICO ", [])[0].code).toBe("MX");
    expect(searchCountries("en", "IT", [])[0].code).toBe("IT");
    expect(
      searchCountries("es", "es", ["ES"]).some((c) => c.code === "ES"),
    ).toBe(false);
  });
  it.each(["es", "en", "it", "de", "fr", "pt"])(
    "sorts an empty query by displayed names in %s",
    (language) => {
      const names = searchCountries(language, "", []).map((c) => c.name);
      expect(names).toEqual(
        [...names].sort(
          new Intl.Collator(language, { sensitivity: "base" }).compare,
        ),
      );
    },
  );
});
