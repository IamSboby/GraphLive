export const genders = [
  "",
  "male",
  "female",
  "nonBinary",
  "agender",
  "genderfluid",
  "genderqueer",
  "bigender",
  "demigender",
  "other",
  "preferNotSay",
] as const;

/** Initial filename prefix only. Existing storage IDs remain immutable. */
export function genderClassification(gender: string): "M" | "F" | "L" | "U" {
  const value = gender.trim().toLowerCase();
  if (["male", "man", "hombre", "masculino"].includes(value)) return "M";
  if (["female", "woman", "mujer", "femenino"].includes(value)) return "F";
  if (
    ["", "unknown", "unspecified", "prefernotsay", "desconocido"].includes(
      value,
    )
  )
    return "U";
  return "L";
}
