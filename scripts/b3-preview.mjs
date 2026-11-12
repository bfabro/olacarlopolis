import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handler as market } from "../netlify/functions/b3-market.mjs";
import { handler as news } from "../netlify/functions/b3-news.mjs";
import { handler as series } from "../netlify/functions/b3-series.mjs";
import { handler as futures } from "../netlify/functions/b3-futures.mjs";
import { handler as strength } from "../netlify/functions/b3-strength.mjs";
import { handler as premarket } from "../netlify/functions/b3-premarket.mjs";
import { handler as usEvents } from "../netlify/functions/b3-us-events.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.B3_PREVIEW_PORT || 8766);
const api = { "/api/b3-market": market, "/api/b3-news": news, "/api/b3-series": series, "/api/b3-futures": futures, "/api/b3-strength": strength, "/api/b3-premarket": premarket, "/api/b3-us-events": usEvents };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`); const fn = api[url.pathname];
    if (fn) {
      const result = await fn({ httpMethod: request.method, queryStringParameters: Object.fromEntries(url.searchParams) });
      response.writeHead(result.statusCode, result.headers); response.end(result.body); return;
    }
    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html"; let file = resolve(root, relative);
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Caminho inválido.");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const body = await readFile(file); response.writeHead(200, { "content-type": types[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" }); response.end(body);
  } catch { response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); response.end("Não encontrado"); }
}).listen(port, "127.0.0.1", () => console.log(`Painel B3: http://127.0.0.1:${port}/b3.html`));
