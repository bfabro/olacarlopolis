import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Menor preço Hoje usa todos os combustiveis e ordena os cards alfabeticamente", () => {
  assert.match(script, /const cheapestByProduct = new Map\(cheapest\.map/);
  assert.match(script, /const dailySummary = options\s*\.map[\s\S]*?\.sort\(\(a, b\) => a\.label\.localeCompare\(b\.label, "pt-BR"\)\)/);
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
  assert.ok(summary.includes("/ litro"));
  const order = [
    "fuel-daily-summary-photo",
    "fuel-daily-summary-station",
    "fuel-daily-summary-divider",
    "<small>Menor preço hoje</small>",
    "fuel-daily-summary-price",
    "<h4>"
  ].map((value) => summary.indexOf(value));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
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
  assert.ok(html.includes("style.css?v=481"));
  assert.ok(html.includes("script.js?v=680"));
  assert.ok(html.includes("Olá Carlópolis v467"));
});
