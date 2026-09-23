import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("pages-dist");
const prefix = process.env.PAGES_BASE_PATH ?? "/GraphLive";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith(prefix + "/")) {
      res.writeHead(404).end();
      return;
    }
    let file = resolve(root, "." + path.slice(prefix.length));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(3102, "127.0.0.1", () =>
  console.log("Pages preview: http://localhost:3102" + prefix + "/"),
);
