import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const fishingJs = readFileSync(new URL("../ola-pesca.js", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("Admin Master exibe atualização coletiva separada por tipo de combustível", () => {
  assert.match(panelHtml, /id="fuelAdminBulkPrices"/);
  assert.match(panelHtml, /Um preço para todos os postos/);
  assert.match(panelHtml, /O último valor salvo prevalece/);
  assert.match(panelJs, /function renderFuelAdminBulkPrices\(\)/);
  assert.match(panelJs, /FUEL_ADMIN_MANUAL_CATALOG\.filter\(\(item\) => item\.tipo === "combustivel"\)/);
  assert.match(panelJs, /data-apply-fuel-bulk/);
  assert.match(panelCss, /\/\* Atualizacao coletiva de combustiveis - v872 \*\//);
});

test("atualização coletiva alcança somente produtos habilitados do mesmo tipo", () => {
  assert.match(panelJs, /function fuelAdminBulkTargets\(kind\)/);
  assert.match(panelJs, /product\?\.ativo === false \|\| fuelAdminProductKind\(productId, product\) !== kind/);
  assert.match(panelJs, /new Set\(targets\.map\(\(target\) => target\.stationId\)\)/);
  assert.match(panelJs, /Aplicar \$\{priceLabel\} para \$\{catalogItem\.nome\}/);
  assert.match(panelJs, /confirm\(`/);
});

test("gravação em massa é atômica, mantém o último valor e registra histórico por posto", () => {
  assert.match(panelJs, /const updates = \{\};/);
  assert.match(panelJs, /updates\[`\$\{base\}\/preco`\] = price/);
  assert.match(panelJs, /updates\[`configuracoes\/combustiveis\/ultimaAtualizacaoMassa\/\$\{kind\}`\] = bulkRecord/);
  assert.match(panelJs, /await update\(ref\(db\), updates\)/);
  assert.match(panelJs, /origem: "admin-master-massa"/);
  assert.match(panelJs, /emMassa: true/);
  assert.match(panelJs, /combustiveisHistorico\/\$\{stationId\}\/\$\{historyId\}/);
  assert.match(panelJs, /Admin Master · atualização coletiva/);
});

test("promoção incompatível é encerrada e versões globais são atualizadas", () => {
  assert.match(panelJs, /promotion\.preco >= price/);
  assert.match(panelJs, /updates\[`\$\{base\}\/promocao`\] = null/);
  assert.match(panelHtml, /painel\.css\?v=570/);
  assert.match(panelHtml, /painel\.js\?v=872/);
  assert.match(panelJs, /numero: 865/);
  assert.match(panelJs, /label: "v872"/);
  assert.match(panelJs, /data: "2026-10-10"/);
  assert.match(indexHtml, /style\.css\?v=579/);
  assert.match(indexHtml, /ola-pesca\.js\?v=89/);
  assert.match(indexHtml, /script\.js\?v=779/);
  assert.match(fishingJs, /FISHING_MAP_VERSION=89/);
  assert.match(serviceWorker, /2026-10-10-pesque-solte-v919/);
});