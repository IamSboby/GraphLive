import {
  cpSync,
  statSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

function removeGenerated(target) {
  if (
    process.platform === "win32" &&
    process.env.GRAPHLIVE_ANDROID === "true"
  ) {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$ErrorActionPreference='Stop'; if (Test-Path -LiteralPath $env:GRAPHLIVE_REMOVE_TARGET) { Remove-Item -LiteralPath $env:GRAPHLIVE_REMOVE_TARGET -Recurse -Force }; if (Test-Path -LiteralPath $env:GRAPHLIVE_REMOVE_TARGET) { throw 'Generated directory was not removed' }",
      ],
      {
        windowsHide: true,
        stdio: "inherit",
        env: { ...process.env, GRAPHLIVE_REMOVE_TARGET: target },
      },
    );
  } else rmSync(target, { recursive: true, force: true });
}
function copy(source, destination) {
  if (
    process.platform !== "win32" ||
    (process.env.GRAPHLIVE_ANDROID !== "true" && !source.startsWith("\\\\"))
  ) {
    cpSync(source, destination, { recursive: true });
    return;
  }
  // Native robocopy avoids a Node fs.cpSync crash overwriting existing UNC trees.
  const directory = statSync(source).isDirectory();
  const args = directory
    ? [source, destination, "/E"]
    : [dirname(source), dirname(destination), basename(source)];
  try {
    execFileSync(
      "robocopy.exe",
      [
        ...args,
        "/COPY:DAT",
        "/DCOPY:DAT",
        "/IS",
        "/IT",
        "/R:1",
        "/W:1",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
      ],
      { windowsHide: true, stdio: "pipe" },
    );
  } catch (error) {
    if (typeof error.status !== "number" || error.status >= 8) throw error;
  }
}
const root = process.env.GRAPHLIVE_BUILD_ROOT
  ? resolve(process.env.GRAPHLIVE_BUILD_ROOT)
  : fileURLToPath(new URL("../", import.meta.url));
const stage = resolve(root, ".pages-build");
const modules = process.env.GRAPHLIVE_NODE_MODULES
  ? resolve(process.env.GRAPHLIVE_NODE_MODULES)
  : join(root, "node_modules");
const output = resolve(root, "pages-dist");
const basePath = process.env.PAGES_BASE_PATH ?? "/GraphLive";
if (!/^(\/[A-Za-z0-9_-]+)*$/.test(basePath))
  throw new Error("Invalid base path");
// Only these fixed generated directories may be removed; source and user data are excluded.
console.log("Preparing static export", { root, stage, output });
for (const target of [stage, output]) {
  if (
    target !== join(root, ".pages-build") &&
    target !== join(root, "pages-dist")
  )
    throw new Error("Invalid build directory");
  if (target === stage && process.env.GRAPHLIVE_ANDROID === "true") continue;
  console.log("Reset output", target);
  removeGenerated(target);
}
mkdirSync(stage, { recursive: true });
for (const name of [
  "app",
  "packages",
  "public",
  "package.json",
  "tsconfig.json",
  "postcss.config.mjs",
]) {
  console.log("Copy source", name);
  copy(join(root, name), join(stage, name));
}
removeGenerated(join(stage, "app", "api"));
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
  `import type {NextConfig} from "next"; const config: NextConfig = {output:"export", trailingSlash:true, basePath:${JSON.stringify(basePath)}, images:{unoptimized:true}, ${process.env.GRAPHLIVE_ANDROID === "true" ? `webpack(config){config.resolve.modules=[${JSON.stringify(modules)},"node_modules"];config.resolveLoader.modules=[${JSON.stringify(modules)},"node_modules"];return config;},` : ""} turbopack:{root:${JSON.stringify(root)}}}; export default config;\n`,
);
execFileSync(
  process.execPath,
  [
    join(modules, "next/dist/bin/next"),
    "build",
    ...(process.env.GRAPHLIVE_ANDROID === "true" ? ["--webpack"] : []),
  ],
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
copy(join(stage, "out"), output);
writeFileSync(join(output, ".nojekyll"), "");
console.log(`Static Pages output: ${output}`);
