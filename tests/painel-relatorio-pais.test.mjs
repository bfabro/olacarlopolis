import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("relatorio identifica somente paises conhecidos fora do Brasil", () => {
  assert.match(panelJs, /function reportCountryInfo\(item = \{\}\)/);
  assert.match(panelJs, /item\.pais \|\| item\.country/);
  assert.match(panelJs, /\["br", "bra", "brasil", "brazil"\]/);
  assert.match(panelJs, /\["", "-", "desconhecido", "indefinido", "unknown"\]/);
  assert.match(panelJs, /acessoExterior: !unknownCountries\.has\(normalizedCountry\) && !brazilAliases\.has\(normalizedCountry\)/);
});

test("pais acompanha cliques e acessos na linha do tempo", () => {
  const clickTimeline = panelJs.slice(panelJs.indexOf("function buildClickTimeline"), panelJs.indexOf("function aggregateItemAccesses"));
  const accessTimeline = panelJs.slice(panelJs.indexOf("function buildAccessTimeline"), panelJs.indexOf("function clientMetricKeys"));
  assert.match(clickTimeline, /\.\.\.reportCountryInfo\(item\)/);
  assert.match(accessTimeline, /\.\.\.reportCountryInfo\(item\)/);
});

test("horario estrangeiro recebe icone acessivel com o pais de origem", () => {
  assert.match(panelJs, /row\.acessoExterior \? `<i class="fa-solid fa-earth-americas report-foreign-access-icon"/);
  assert.match(panelJs, /aria-label="Acesso de outro pais: \$\{escapeAttr\(row\.pais\)\}"/);
  assert.match(panelCss, /\.report-time-value[\s\S]*display: inline-flex/);
  assert.match(panelCss, /\.report-foreign-access-icon[\s\S]*background: #6d5bd0/);
});