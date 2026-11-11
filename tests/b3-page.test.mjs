import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("pagina B3 possui as sete secoes e arquivos versionados", async () => {
  const html = await read("b3.html");
  for (const section of ["resumo", "commodities", "bolsas", "analise", "daytrade", "noticias", "contratos"]) assert.match(html, new RegExp(`data-panel="${section}"`));
  assert.match(html, /b3\.css\?v=5/); assert.match(html, /b3\.js\?v=5/);
});

test("tela day trade inclui horarios, checklist, risco e fontes oficiais", async () => {
  const [html, client, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-series.mjs")]);
  assert.match(html, /id="tradeTimeline"/); assert.match(html, /id="tradeChecklist"/); assert.match(html, /id="riskResult"/);
  assert.match(html, /Agenda econômica do Banco Central/); assert.match(html, /Horários oficiais da B3/);
  assert.match(client, /renderTradeTimeline/); assert.match(client, /calculateTradeRisk/); assert.match(client, /renderTradeContext/);
  assert.match(client, /Referências após a abertura/); assert.match(client, /Mercados dos EUA/); assert.match(series, /regularMarketOpen/);
});

test("noticias ampliadas, bolsas consolidadas e niveis tecnicos", async () => {
  const [html, client, news, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-news.mjs"), read("netlify/functions/b3-series.mjs")]);
  assert.match(client, /slice\(0, 9\)/); assert.match(news, /EMBR3/); assert.match(client, /Todas \+ média/); assert.match(client, /Média global/);
  assert.match(html, /id="supportLevels"/); assert.match(series, /resistance1/); assert.match(series, /support2/);
});

test("noticias cronologicas, alertas intradiarios e influencia externa atualizavel", async () => {
  const [html, client, news, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-news.mjs"), read("netlify/functions/b3-series.mjs")]);
  assert.match(news, /intradayImpact/); assert.match(news, /new Date\(b\.publishedAt\) - new Date\(a\.publishedAt\)/);
  assert.match(client, /Impacto no day trade · em tempo real/); assert.match(client, /renderInfluenceProbability/); assert.match(client, /setInterval\(\(\) => \{ if \(!document\.hidden\) ensureOverview\(true\)/);
  assert.match(html, /id="tradeUpdatedAt"/); assert.match(html, /id="influenceProbability"/); assert.match(series, /regularMarketPrice/);
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
