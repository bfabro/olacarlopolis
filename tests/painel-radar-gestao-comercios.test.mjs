import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("radar gerencial transforma metricas em prioridades claras por comercio", () => {
  assert.match(panelJs, /function buildBusinessDecisionRows\(clients = \[\], accesses = new Map\(\), clickDetails = new Map\(\)\)/);
  assert.match(panelJs, /priorityLabel = "Ir atrás"/);
  assert.match(panelJs, /priorityLabel = "Melhorar conversão"/);
  assert.match(panelJs, /Pontos positivos/);
  assert.match(panelJs, /Pontos de atenção/);
  assert.match(panelJs, /Próxima ação/);
  assert.match(panelJs, /Radar de decisão dos comércios/);
  assert.match(panelCss, /\.business-decision-table/);
  assert.match(panelCss, /\.business-priority\.is-critica/);
});

test("relatorio aponta categorias procuradas com pouca oferta", () => {
  assert.match(panelJs, /function buildCategoryProspectingRows\(groups = \[\], clients = \[\]\)/);
  assert.match(panelJs, /Cruza a procura no menu Comércios/);
  assert.match(panelJs, /Procurar e cadastrar um comércio dessa categoria/);
  assert.match(panelJs, /Categorias para prospecção/);
  assert.match(panelCss, /\.category-prospecting-table/);
});
