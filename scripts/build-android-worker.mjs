import { rolldown } from "rolldown";
import { resolve } from "node:path";
const bundle = await rolldown({
  input: "packages/sync-engine/android-worker.ts",
  platform: "neutral",
});
try {
  await bundle.write({
    file: resolve("android/app/src/main/assets/graphlive-sync.js"),
    format: "iife",
    minify: true,
  });
} finally {
  await bundle.close();
}
