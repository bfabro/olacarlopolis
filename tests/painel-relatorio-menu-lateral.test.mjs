import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const siteHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("menu publico registra grupo categoria e caminho detalhado", () => {
  assert.match(siteHtml, /grupoId: slugMenu\(grupo\)/);
  assert.match(siteHtml, /const categoria = tipo === "categoria"/);
  assert.match(siteHtml, /caminho: grupo && categoria/);
  assert.match(siteHtml, /ts: firebase\.database\.ServerValue\.TIMESTAMP/);
});

test("relatorio master separa comercios servicos e setor publico", () => {
  assert.match(panelJs, /const MENU_REPORT_GROUPS = \[/);
  assert.match(panelJs, /label: "Comércios"/);
  assert.match(panelJs, /label: "Serviços"/);
  assert.match(panelJs, /label: "Setor Público"/);
  assert.match(panelJs, /function buildMenuGroupBreakdown\(rows = \[\]\)/);
  assert.match(panelJs, /path: `\$\{group\.label\} → \$\{row\.label\}`/);
  assert.match(panelJs, /Detalhamento por categoria/);
  assert.match(panelCss, /\.menu-group-breakdown-grid/);
  assert.match(panelCss, /\.menu-category-detail-table/);
});
