import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelSource = await readFile(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelStyles = await readFile(new URL("../admin/painel.css", import.meta.url), "utf8");

function sourceBetween(start, end) {
  const startIndex = panelSource.indexOf(start);
  const endIndex = panelSource.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Bloco nao encontrado: ${start}`);
  return panelSource.slice(startIndex, endIndex);
}

test("fatura apresenta o Pix estatico antes de aguardar a integracao", () => {
  const handler = sourceBetween(
    '$("generateSelectedInvoicePix")?.addEventListener',
    '$("generateClientBoletos")?.addEventListener'
  );
  assert.ok(handler.indexOf("presentSelectedPix(unified.pixCode") < handler.indexOf("await createIntegratedPaymentCharge"));
  assert.match(handler, /const button = event\.currentTarget/);
  assert.match(handler, /setBusy\(button, false\)/);

  const selectionBuilder = sourceBetween("const selectedInvoiceData", "const refreshSelectedInvoicePayment");
  assert.match(selectionBuilder, /buildClientInvoice\(plannedClient, mes, paymentConfig\)/);
  assert.doesNotMatch(selectionBuilder, /buildClientInvoice\(plannedClient, mes, paymentConfig, null, \{ ignoreSaved: true \}\)/);
});

test("escolha de plano tambem apresenta o Pix antes de salvar remotamente", () => {
  const handler = sourceBetween(
    'mount.querySelector("[data-generate-plan-pix]")?.addEventListener',
    'mount.querySelector("[data-generate-plan-boleto]")?.addEventListener'
  );
  assert.ok(handler.indexOf("presentPlanPix(selection.invoice.pixCode") < handler.indexOf("await saveClientPlanRequest"));
});

test("botoes de geracao do Pix usam destaque visual especifico", () => {
  assert.match(panelSource, /class="pix-primary-button" data-generate-plan-pix/);
  assert.match(panelSource, /id="generateSelectedInvoicePix"[^>]+class="pix-primary-button"/);
  assert.match(panelStyles, /\.pix-primary-button\s*\{[^}]*background:\s*#047857/s);
});

test("fatura prioriza o valor total persistido", () => {
  const builderSource = sourceBetween("function buildClientInvoice", "function monthKeyOffset");
  assert.match(builderSource, /const savedTotal = options\.ignoreSaved \? 0 : Number\(saved\.valorTotal \|\| 0\)/);
  assert.match(builderSource, /savedTotal > 0 \? savedTotal : valorPlano/);

  const buildClientInvoice = new Function(
    "valorFinalPlano",
    "financePlanDueDate",
    "invoiceDueDateForMonth",
    "normalizeName",
    "gerarPixCopiaCola",
    "qrCodeUrl",
    `${builderSource}; return buildClientInvoice;`
  )(
    () => 0,
    () => "",
    () => "2026-09-30",
    (value) => String(value || "").toLowerCase(),
    ({ valor }) => `PIX:${valor}`,
    (code) => `QR:${code}`
  );
  const invoice = buildClientInvoice({
    id: "cliente-antigo",
    nome: "Cliente Antigo",
    faturas: { "2026-09": { valorTotal: 87.5 } }
  }, "2026-09", { pixChave: "pix@example.com" });
  assert.equal(invoice.valorTotal, 87.5);
  assert.equal(invoice.pixCode, "PIX:87.5");
  assert.equal(invoice.qrUrl, "QR:PIX:87.5");
});

test("plano preserva o valor individual do cliente como fallback", () => {
  const builderSource = sourceBetween("function clientForInvoicePlan", "function planPeriodMonths");
  assert.match(builderSource, /isCurrentPlan && currentClientValue > 0/);
  assert.match(builderSource, /valorPlano: planValue/);
});

test("gerador cria payload Pix copia e cola com valor e CRC", () => {
  const pixCoreSource = sourceBetween("function textPix", "function normalizeImageItems");
  const gerarPixCopiaCola = new Function(`${pixCoreSource}; return gerarPixCopiaCola;`)();
  const payload = gerarPixCopiaCola({
    chave: "pix@example.com",
    nome: "Ola Carlopolis",
    cidade: "Carlopolis",
    valor: 87.5,
    txid: "FATURA202609"
  });
  assert.match(payload, /^000201/);
  assert.match(payload, /540587\.50/);
  assert.match(payload, /6304[0-9A-F]{4}$/);
});
