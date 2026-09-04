import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Resumo de hoje usa todos os combustiveis configurados e o menor preco existente", () => {
  assert.match(script, /const cheapestByProduct = new Map\(cheapest\.map/);
  assert.match(script, /const dailySummary = options\.map/);
  assert.match(script, /best\?\.station\?\.imagem/);
  assert.ok(script.includes("Preço não informado"));
  assert.ok(script.includes("Resumo de hoje"));
});

test("Resumo de hoje nao possui selecao nem link de ranking", () => {
  const start = script.indexOf('<section class="fuel-daily-summary"');
  const end = script.indexOf('<nav class="fuel-filter-chips"', start);
  const summary = script.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(summary, /Selecionado|Ver ranking/);
});

test("cards do resumo sao uniformes e responsivos", () => {
  assert.match(style, /\.fuel-daily-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(style, /@media \(max-width: 720px\)[\s\S]*?\.fuel-daily-summary-grid\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(style, /\.fuel-daily-summary-photo img\s*\{[^}]*object-fit:\s*cover/);
  assert.match(style, /\.fuel-daily-summary-card\s*\{[^}]*border:\s*1px solid #dfe5ec/);
});

test("versoes publicas foram atualizadas", () => {
  assert.ok(html.includes("style.css?v=480"));
  assert.ok(html.includes("script.js?v=679"));
  assert.ok(html.includes("Olá Carlópolis v466"));
});
