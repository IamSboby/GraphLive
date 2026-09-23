import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
const root = fileURLToPath(new URL("../", import.meta.url));
// Package only versioned source; local configuration and temporary files stay local.
function walk() {
  return execFileSync(
    "git",
    ["-c", "safe.directory=" + root, "ls-files", "-z"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean)
    .filter((name) => !name.split("/").some((part) => part.startsWith(".env")));
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
