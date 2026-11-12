import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("pagina B3 possui as oito secoes e arquivos versionados", async () => {
  const html = await read("b3.html");
  for (const section of ["resumo", "forca", "commodities", "bolsas", "analise", "daytrade", "noticias", "contratos"]) assert.match(html, new RegExp(`data-panel="${section}"`));
  assert.match(html, /b3\.css\?v=11/); assert.match(html, /b3\.js\?v=11/);
});

test("tela forca B3 combina peso, impacto e grafico intradiario", async () => {
  const [html, client, strength, config, preview] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-strength.mjs"), read("netlify.toml"), read("scripts/b3-preview.mjs")]);
  assert.match(html, /data-panel="forca"/); assert.match(html, /id="strengthRanking"/); assert.match(html, /id="contributionChart"/);
  assert.match(client, /renderStrengthChart/); assert.match(client, /renderStrengthInsights/); assert.match(html, /peso × variação do dia/i);
  assert.match(strength, /VALE3\.SA/); assert.match(strength, /BPAC11\.SA/); assert.match(strength, /interval=5m/); assert.match(strength, /weightDate: "2026-11-11"/);
  assert.match(config, /\/api\/b3-strength/); assert.match(preview, /b3-strength\.mjs/);
});

test("ranking de forca ordena colunas e calcula media dos doze papeis", async () => {
  const [html, client] = await Promise.all([read("b3.html"), read("b3.js")]);
  for (const column of ["ticker", "weight", "current", "change", "contribution"]) assert.match(client, new RegExp(`data-strength-column=\\"${column}\\"`));
  assert.match(client, /strengthSort: "weight"/); assert.match(client, /strengthSortDirection: "desc"/); assert.match(client, /renderStrengthAverageChart/);
  assert.match(html, /id="strengthAverageChart"/); assert.match(html, /Índice médio dos 12 papéis/); assert.match(html, /Cada ação vale 1\/12/);
  assert.match(html, /id="strengthAverageSummary"/); assert.match(client, /strength-total-row/); assert.match(client, /peso somado/); assert.match(client, /impacto líquido/);
});

test("forca B3 inclui commodities para leitura entre 9h e 10h", async () => {
  const [html, client, premarket, config, preview] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-premarket.mjs"), read("netlify.toml"), read("scripts/b3-preview.mjs")]);
  assert.match(html, /data-strength-view="commodities"/); assert.match(html, /Commodities · 9h às 10h/); assert.match(html, /id="premarketChart"/); assert.match(html, /id="premarketInsights"/);
  assert.match(client, /loadPremarket/); assert.match(client, /renderPremarketChart/); assert.match(client, /renderPremarketInsights/);
  assert.match(premarket, /BZ=F/); assert.match(premarket, /TIO=F/); assert.match(premarket, /directWeight: 15\.51/); assert.match(premarket, /interval=5m/);
  assert.match(config, /\/api\/b3-premarket/); assert.match(preview, /b3-premarket\.mjs/);
});

test("tela day trade inclui horarios, checklist, risco e fontes oficiais", async () => {
  const [html, client, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-series.mjs")]);
  assert.match(html, /id="tradeTimeline"/); assert.match(html, /id="tradeChecklist"/); assert.match(html, /id="riskResult"/);
  assert.match(html, /Agenda econômica do Banco Central/); assert.match(html, /Horários oficiais da B3/);
  assert.match(client, /renderTradeTimeline/); assert.match(client, /calculateTradeRisk/); assert.match(client, /renderTradeContext/);
  assert.match(client, /Referências após a abertura/); assert.match(client, /Mercados dos EUA/); assert.match(series, /regularMarketOpen/);
});

test("linha do tempo inclui eventos relevantes dos EUA e cenarios para a B3", async () => {
  const [html, client, events, config, preview] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-us-events.mjs"), read("netlify.toml"), read("scripts/b3-preview.mjs")]);
  assert.match(html, /id="usEventsUpcoming"/); assert.match(html, /Agenda oficial BLS\/EUA/); assert.match(html, /Calendário do Federal Reserve/);
  assert.match(client, /loadUsEvents/); assert.match(client, /Se vier favorável/); assert.match(client, /Se vier desfavorável/); assert.match(client, /importância/);
  assert.match(events, /BLS_ICS/); assert.match(events, /Pedidos de seguro-desemprego/); assert.match(events, /FOMC · decisão de juros/);
  assert.match(config, /\/api\/b3-us-events/); assert.match(preview, /b3-us-events\.mjs/);
});

test("noticias ampliadas, bolsas consolidadas e niveis tecnicos", async () => {
  const [html, client, news, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-news.mjs"), read("netlify/functions/b3-series.mjs")]);
  assert.match(client, /slice\(0, 9\)/); assert.match(news, /EMBR3/); assert.match(client, /Todas \+ média/); assert.match(client, /Média global/);
  assert.match(html, /id="supportLevels"/); assert.match(series, /resistance1/); assert.match(series, /support2/);
});

test("noticias cronologicas, alertas intradiarios e influencia externa atualizavel", async () => {
  const [html, client, news, series] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-news.mjs"), read("netlify/functions/b3-series.mjs")]);
  assert.match(news, /intradayImpact/); assert.match(news, /new Date\(b\.publishedAt\) - new Date\(a\.publishedAt\)/);
  assert.match(client, /Impacto no day trade · em tempo real/); assert.match(client, /renderInfluenceProbability/); assert.match(client, /ensureOverview\(true\)/);
  assert.match(html, /id="tradeUpdatedAt"/); assert.match(html, /id="influenceProbability"/); assert.match(series, /regularMarketPrice/);
});

test("noticias recebem pontuacao de impacto e resumo mostra tendencia de indice e dolar", async () => {
  const [html, client, news] = await Promise.all([read("b3.html"), read("b3.js"), read("netlify/functions/b3-news.mjs")]);
  assert.match(news, /impactScores/); assert.match(news, /dayTradeScore/); assert.match(news, /assetScore/); assert.match(news, /scoreReason/);
  assert.match(client, /Impacto no day trade/); assert.match(client, /renderSummaryTrend/); assert.match(client, /Desde a abertura/);
  assert.match(html, /id="summaryTrend"/); assert.match(html, /TENDÊNCIA DO MOMENTO/); assert.match(html, /Ibovespa e dólar/);
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
