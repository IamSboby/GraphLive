import { themePalette } from "./config";
export function dashboardPalette(dark: boolean) {
  return {
    ...themePalette(undefined, dark),
    ...(dark
      ? {
          bg: "#141416",
          surface: "#1e1e21",
          text: "#ededf0",
          muted: "#a5a5ad",
          border: "#35353b",
          accent: "#d4d4d8",
          soft: "#2a2a30",
          dot: "#35353b",
        }
      : {
          bg: "#f6f6f7",
          surface: "#ffffff",
          text: "#252528",
          muted: "#66666f",
          border: "#dddddf",
          accent: "#404045",
          soft: "#ececee",
          dot: "#dddddf",
        }),
  };
}
