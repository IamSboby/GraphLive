import ts from "typescript";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
for (const file of [
  "packages/domain/model.ts",
  "packages/graph-engine/metrics.ts",
  "packages/graph-engine/layout.ts",
  "scripts/benchmark.ts",
]) {
  const output = resolve(".bench", file.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
  );
}
writeFileSync(".bench/package.json", '{"type":"commonjs"}');
createRequire(import.meta.url)("../.bench/scripts/benchmark.js");
