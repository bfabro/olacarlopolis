import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");

test("promocao vazia nao bloqueia o botao geral Salvar meus dados", () => {
  const start = panelJs.indexOf('<input id="coPromoTitle"');
  const end = panelJs.indexOf(">", start);
  const promoTitle = start >= 0 && end > start ? panelJs.slice(start, end + 1) : "";
  assert.ok(promoTitle, "campo de titulo da promocao deve existir");
  assert.ok(!promoTitle.includes(" required"), "campo da promocao nao pode participar da validacao nativa do formulario geral");
  assert.ok(panelJs.includes('if (!title) {'));
  assert.ok(panelJs.includes("Informe o titulo da promocao."));
});

test("formulario Minha empresa continua salvando pelo evento submit", () => {
  assert.ok(panelJs.includes('id="clientOnlyForm"'));
  assert.ok(panelJs.includes('<button type="submit">Salvar meus dados</button>'));
  assert.ok(panelJs.includes('clientOnlyForm").addEventListener("submit"'));
  assert.ok(panelJs.includes("await update(ref(db"));
});

test("versao corrigida do painel e carregada sem cache antigo", () => {
  assert.ok(panelHtml.includes("painel.js?v=650"));
  assert.ok(panelJs.includes("numero: 713"));
  assert.ok(panelJs.includes('label: "v720"'));
});