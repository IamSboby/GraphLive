import { z } from "zod";
import relationships from "./relationship-colors.json";
import themes from "./themes.json";
export type RelationshipKey = keyof typeof relationships.colors;
export const relationshipTypes = Object.keys(relationships.colors) as [
  RelationshipKey,
  ...RelationshipKey[],
];
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const relationshipOverridesSchema = z.partialRecord(
  z.enum(relationshipTypes),
  hexColor,
);
export const relationshipFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    colors: z.record(z.enum(relationshipTypes), hexColor),
  })
  .strict();
export const defaultRelationshipColors =
  relationshipFileSchema.parse(relationships).colors;
export const themeSchema = z
  .object({
    bg: hexColor,
    surface: hexColor,
    text: hexColor,
    muted: hexColor,
    border: hexColor,
    accent: hexColor,
    soft: hexColor,
    danger: hexColor,
    dot: hexColor,
    ownerStart: hexColor,
    ownerEnd: hexColor,
  })
  .strict();
export const themeNames = ["classic", "forest", "rose", "indigo"] as const;
export const themeFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    light: themeSchema,
    dark: themeSchema,
  })
  .strict();
export const appearancePreferencesShape = {
  relationshipColors: relationshipOverridesSchema.optional(),
  themePreset: z.enum(themeNames).optional(),
  customThemes: z
    .object({
      light: themeSchema.partial().optional(),
      dark: themeSchema.partial().optional(),
    })
    .strict()
    .optional(),
};
export const appearanceSchema = z.object(appearancePreferencesShape);
export type Appearance = z.infer<typeof appearanceSchema>;
export function relationshipPalette(preferences?: Appearance) {
  return { ...defaultRelationshipColors, ...preferences?.relationshipColors };
}
export function themePalette(
  preferences: Appearance | undefined,
  dark: boolean,
) {
  const mode = dark ? "dark" : "light";
  return themeSchema.parse({
    ...themes.presets[preferences?.themePreset ?? "classic"][mode],
    ...preferences?.customThemes?.[mode],
  });
}
export const themeKeys = Object.keys(
  themes.presets.classic.light,
) as (keyof z.infer<typeof themeSchema>)[];
export function cssTheme(preferences: Appearance | undefined, dark: boolean) {
  return Object.entries(themePalette(preferences, dark))
    .map(([key, value]) => `--${key}:${value}`)
    .join(";");
}
export const defaultThemeCss = `:root{${cssTheme(undefined, false)}}:root[data-theme="dark"]{${cssTheme(undefined, true)}}`;
