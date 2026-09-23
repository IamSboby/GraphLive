import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set([
  "node_modules",
  ".pages-build",
  "pages-dist",
  ".git",
  ".next",
  ".bench",
  "data",
  "test-results",
  "playwright-report",
]);
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      excluded.has(entry.name) ||
      (entry.name.startsWith(".env") && entry.name !== ".env.example") ||
      entry.name.endsWith(".tsbuildinfo") ||
      entry.name === "next-env.d.ts"
    )
      return [];
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : entry.isFile()
        ? [relative(root, path).replaceAll("\\", "/")]
        : [];
  });
}
const treePath = "docs/repository-tree.md";
const names = [...new Set([...walk(root), treePath])].sort();
const tree = {};
for (const file of names) {
  let node = tree;
  const parts = file.split("/");
  for (const part of parts) node = node[part] ??= {};
}
function render(node, prefix = "") {
  const keys = Object.keys(node).sort();
  return keys.flatMap((name, i) => {
    const last = i === keys.length - 1,
      child = node[name],
      directory = Object.keys(child).length > 0;
    return [
      prefix + (last ? "└── " : "├── ") + name + (directory ? "/" : ""),
      ...render(child, prefix + (last ? "    " : "│   ")),
    ];
  });
}
writeFileSync(
  join(root, treePath),
  "# Árbol completo del código entregado\n\nSe omiten dependencias instaladas, compilación, datos, metadatos Git y temporales.\n\n```text\nGraphLive/\n" +
    render(tree).join("\n") +
    "\n```\n",
);
const files = Object.fromEntries(
  walk(root).map((name) => [
    "GraphLive/" + name,
    new Uint8Array(readFileSync(join(root, name))),
  ]),
);
const bytes = zipSync(files, { level: 9 });
const output = resolve(root, "../GraphLive.zip");
writeFileSync(output, bytes);
writeFileSync(
  output + ".sha256",
  createHash("sha256").update(bytes).digest("hex") + "  GraphLive.zip\n",
);
console.log(
  JSON.stringify({
    files: Object.keys(files).length,
    bytes: bytes.byteLength,
    output,
  }),
);
