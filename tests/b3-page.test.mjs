import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("pagina B3 possui as seis secoes e arquivos versionados", async () => {
  const html = await read("b3.html");
  for (const section of ["resumo", "commodities", "bolsas", "analise", "noticias", "contratos"]) assert.match(html, new RegExp(`data-panel="${section}"`));
  assert.match(html, /b3\.css\?v=2/); assert.match(html, /b3\.js\?v=2/);
});

test("pagina identifica fontes e ressalva informativa", async () => {
  const html = await read("b3.html");
  assert.match(html, /Informativo, não recomendação/); assert.match(html, /TradingView/); assert.match(html, /brapi\.dev/); assert.match(html, /BDI oficial da B3/);
});

test("funcoes de mercado nao exigem segredo no cliente", async () => {
  const [client, market, news] = await Promise.all([read("b3.js"), read("netlify/functions/b3-market.mjs"), read("netlify/functions/b3-news.mjs")]);
  assert.doesNotMatch(client, /token=/i); assert.match(market, /brapi\.dev/); assert.match(news, /news\.google\.com\/rss/);
});

test("graficos proprios incluem media de acoes e direcao consolidada", async () => {
  const [html, client, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-series.mjs")]);
  assert.match(html, /Commodity × média das ações/); assert.match(html, /id="directionCard"/); assert.match(html, /id="d1Futures"/);
  assert.match(client, /averageSeries/); assert.match(client, /Viés provável de alta/); assert.match(series, /JALL3\.SA/); assert.match(series, /AGRO3\.SA/);
});
