import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const stage = resolve(root, ".pages-build");
const output = resolve(root, "pages-dist");
const basePath = process.env.PAGES_BASE_PATH ?? "/GraphLive";
if (!/^(\/[A-Za-z0-9_-]+)*$/.test(basePath))
  throw new Error("Invalid base path");
// Only these fixed generated directories may be removed; source and user data are excluded.
for (const target of [stage, output]) {
  if (
    target !== join(root, ".pages-build") &&
    target !== join(root, "pages-dist")
  )
    throw new Error("Invalid build directory");
  rmSync(target, { recursive: true, force: true });
}
mkdirSync(stage, { recursive: true });
for (const name of [
  "app",
  "packages",
  "public",
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
])
  cpSync(join(root, name), join(stage, name), { recursive: true });
rmSync(join(stage, "app", "api"), { recursive: true, force: true });
const edit = (name, fn) =>
  writeFileSync(
    join(stage, name),
    fn(readFileSync(join(stage, name), "utf8").replaceAll("\r\n", "\n")),
  );
for (const name of [
  "app/page.tsx",
  "app/login/page.tsx",
  "app/graph/page.tsx",
  "app/dashboard/page.tsx",
])
  edit(name, (s) =>
    s.replace(
      'export const dynamic = "force-dynamic";',
      'export const dynamic = "force-static";',
    ),
  );
edit("app/layout.tsx", (s) =>
  s
    .replace('import { headers } from "next/headers";\n', "")
    .replace(
      'const nonce = (await headers()).get("x-nonce") ?? undefined;',
      "const nonce = undefined;",
    ),
);
writeFileSync(
  join(stage, "packages/ui/application-page.tsx"),
  `import { App } from "./app";
import { configuration } from "../config";
export function ApplicationPage({screen}: {screen: "home" | "login" | "graph" | "dashboard"}) {
  return <App screen={screen} config={{...configuration(), auth:false, server:false, local:true, googleLogin:false, microsoftLogin:false}} authenticated={false} authError={false} />;
}
`,
);
writeFileSync(
  join(stage, "next.config.ts"),
  `export default {output:"export", trailingSlash:true, basePath:${JSON.stringify(basePath)}, images:{unoptimized:true}, turbopack:{root:${JSON.stringify(root)}}};\n`,
);
execFileSync(
  process.execPath,
  [join(root, "node_modules/next/dist/bin/next"), "build"],
  {
    cwd: stage,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  },
);
cpSync(join(stage, "out"), output, { recursive: true });
writeFileSync(join(output, ".nojekyll"), "");
console.log(`Static Pages output: ${output}`);
