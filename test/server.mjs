import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const root = resolve(".");
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".wasm": "application/wasm" };
createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = resolve(root, `.${path}`);
  if (!/^\/(dist|test)\//.test(path) || !file.startsWith(`${root}${sep}`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Security-Policy": "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; " +
        "connect-src 'self'; worker-src 'self'",
    }).end(bytes);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4177, "127.0.0.1");
