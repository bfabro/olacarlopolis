import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Menor preço Hoje usa todos os combustiveis na ordem comercial definida", () => {
  assert.match(script, /const cheapestByProduct = new Map\(cheapest\.map/);
  assert.match(script, /function fuelPublicSummaryOrder/);
  ["arla", "etanol", "s500", "s10", "gasolina"].forEach((term) => {
    assert.ok(script.includes('key.includes("' + term + '")'));
  });
  assert.ok(script.includes("fuelPublicSummaryOrder(a.label) - fuelPublicSummaryOrder(b.label)"));
  assert.match(script, /best\?\.station\?\.imagem/);
  assert.ok(script.includes("Preço não informado"));
  assert.ok(script.includes("Menor preço Hoje"));
});

test("card mostra posto, rota, separador, preço por litro e combustível nessa ordem", () => {
  const start = script.indexOf('<section class="fuel-daily-summary"');
  const end = script.indexOf('<section class="fuel-stations-section', start);
  const summary = script.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(summary, /fuelPublicMapUrl\(best\.station, config\)/);
  assert.match(summary, /target="_blank" rel="noopener noreferrer"/);
  assert.match(summary, /fa-solid fa-location-arrow/);
  assert.doesNotMatch(summary, /fa-solid fa-route|fa-solid fa-arrow-right/);
  assert.ok(summary.includes("/ litro"));
  const order = [
    "fuel-daily-summary-photo",
    "fuel-daily-summary-station",
    "fuel-daily-summary-divider",
    "<small>Menor preço hoje</small>",
    "fuel-daily-summary-price",
    '<h4 class="fuel-daily-summary-fuel'
  ].map((value) => summary.indexOf(value));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("preco do resumo usa duas casas e combustiveis possuem icones e cores proprias", () => {
  const moneyStart = script.indexOf("function fuelPublicSummaryMoney");
  const moneyEnd = script.indexOf("function fuelPublicDate", moneyStart);
  const moneyFormatter = script.slice(moneyStart, moneyEnd);
  assert.ok(moneyStart >= 0 && moneyEnd > moneyStart);
  assert.ok(moneyFormatter.includes("minimumFractionDigits: 2"));
  assert.ok(moneyFormatter.includes("maximumFractionDigits: 2"));
  assert.ok(script.includes("fuelPublicSummaryMoney(best.price)"));
  assert.match(script, /function fuelPublicSummaryVisual/);
  ["is-arla", "is-diesel-s10", "is-diesel-s500", "is-etanol", "is-gasolina-aditivada", "is-gasolina-comum"].forEach((className) => {
    assert.ok(script.includes(className));
    assert.ok(style.includes(".fuel-daily-summary-fuel." + className));
  });
  ["fa-flask", "fa-leaf", "fa-droplet", "fa-gas-pump", "fa-truck-fast", "fa-oil-can"].forEach((icon) => {
    assert.ok(script.includes(icon));
  });
});

test("botoes abaixo do resumo foram removidos sem manter filtro oculto", () => {
  assert.doesNotMatch(script, /<nav class="fuel-filter-chips"/);
  assert.doesNotMatch(script, /data-fuel-filter/);
  assert.match(script, /const visibleStations = stations;/);
});

test("cards do resumo sao uniformes e responsivos", () => {
  assert.match(style, /\.fuel-daily-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(style, /@media \(max-width: 720px\)[\s\S]*?\.fuel-daily-summary-grid\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(style, /\.fuel-daily-summary-photo img\s*\{[^}]*object-fit:\s*cover/);
  assert.match(style, /\.fuel-daily-summary-card\s*\{[^}]*border:\s*1px solid #dfe5ec/);
  assert.match(style, /\.fuel-daily-summary-station > a\s*\{[^}]*border-radius:\s*50%/);
});

test("versoes publicas foram atualizadas", () => {
  assert.ok(html.includes("style.css?v=482"));
  assert.ok(html.includes("script.js?v=682"));
  assert.ok(html.includes("Olá Carlópolis v470"));
});
