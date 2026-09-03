import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelSource = await readFile(new URL("../admin/painel.js", import.meta.url), "utf8");

function sourceBetween(start, end) {
  const startIndex = panelSource.indexOf(start);
  const endIndex = panelSource.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Bloco nao encontrado: ${start}`);
  return panelSource.slice(startIndex, endIndex);
}

test("cliente isento recebe tela propria antes dos valores e planos", () => {
  const render = sourceBetween("function renderClientInvoices", "async function createPanelUser");
  const exemptStart = render.indexOf('const isExempt = effectivePaymentStatus(client) === "isento"');
  const regularBillingStart = render.indexOf("const paymentConfig = state.pagamentoSistema");
  assert.ok(exemptStart >= 0 && exemptStart < regularBillingStart);

  const exemptBlock = render.slice(exemptStart, regularBillingStart);
  assert.match(exemptBlock, /<strong>Isento<\/strong>/);
  assert.match(exemptBlock, /Sem mensalidade/);
  assert.match(exemptBlock, /Nenhuma cobranca disponivel|Nenhuma cobrança disponível/);
  assert.doesNotMatch(exemptBlock, /moneyBR\(/);
  assert.doesNotMatch(exemptBlock, /data-generate-plan-pix|generateSelectedInvoicePix/);
});

test("cliente isento nao recebe comparador nem geradores de cobranca", () => {
  const chooser = sourceBetween("function clientPlanChooserCard", "function presentClientPlanPix");
  const binder = sourceBetween("function bindClientPlanPaymentControls", "function selectedClientInvoicePaymentData");
  const pixGenerator = sourceBetween("async function generateSelectedClientInvoicePix", "function renderClientInvoices");
  const planRequest = sourceBetween("async function saveClientPlanRequest", "function valorFinalPlano");

  assert.match(chooser, /effectivePaymentStatus\(client\) === "isento"\) return ""/);
  assert.match(binder, /effectivePaymentStatus\(client\) === "isento"\) return/);
  assert.match(pixGenerator, /effectivePaymentStatus\(client\) === "isento"/);
  assert.match(planRequest, /Cliente isento não pode gerar cobrança de plano/);
});
