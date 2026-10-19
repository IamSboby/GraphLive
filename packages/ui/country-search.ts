import { countryCodes } from "./flags";
import { normalize } from "../domain/model";

/** Rank visible localized names before incidental substring matches. */
export function searchCountries(
  language: string,
  query: string,
  selected: string[],
) {
  const names = new Intl.DisplayNames([language], { type: "region" });
  const collator = new Intl.Collator(language, { sensitivity: "base" });
  const term = normalize(query);
  return countryCodes
    .filter((code) => !selected.includes(code))
    .map((code) => {
      const name = names.of(code) ?? code;
      const normalizedName = normalize(name);
      const normalizedCode = normalize(code);
      const rank = !term
        ? 0
        : normalizedName === term || normalizedCode === term
          ? 0
          : normalizedName.startsWith(term)
            ? 1
            : normalizedCode.startsWith(term)
              ? 2
              : normalizedName.includes(term) || normalizedCode.includes(term)
                ? 3
                : 4;
      return { code, name, rank };
    })
    .filter((country) => country.rank < 4)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        collator.compare(a.name, b.name) ||
        a.code.localeCompare(b.code),
    );
}
