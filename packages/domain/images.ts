import { z } from "zod";
// Embedded raster images travel with exports and cloud snapshots.
export const embeddedImage = (max: number) =>
  z
    .string()
    .max(max)
    .regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/)
    .optional();
export const imageLimits = { portrait: 120000, banner: 300000 } as const;
