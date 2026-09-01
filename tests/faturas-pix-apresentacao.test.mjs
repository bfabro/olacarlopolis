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
  const handler = sourceBetween("async function generateSelectedClientInvoicePix", "function renderClientInvoices");
  assert.ok(handler.indexOf("presentClientInvoicePix(mount, unified.pixCode") < handler.indexOf("await createIntegratedPaymentCharge"));
  assert.match(handler, /setBusy\(button, false\)/);

  const selectionBuilder = sourceBetween("function selectedClientInvoicePaymentData", "function presentClientInvoicePix");
  assert.match(selectionBuilder, /buildClientInvoice\(plannedClient, mes, paymentConfig\)/);
  assert.doesNotMatch(selectionBuilder, /buildClientInvoice\(plannedClient, mes, paymentConfig, null, \{ ignoreSaved: true \}\)/);
});

test("clique do Pix usa delegacao no conteiner permanente de faturas", () => {
  const setup = sourceBetween("function bindEvents", "bindEvents();");
  assert.match(setup, /\$\("clientInvoicesMount"\)\?\.addEventListener\("click"/);
  assert.match(setup, /event\.target\.closest\("#generateSelectedInvoicePix"\)/);
  assert.match(setup, /generateSelectedClientInvoicePix\(button\)/);
  assert.doesNotMatch(panelSource, /\$\("generateSelectedInvoicePix"\)\?\.addEventListener/);
});

test("apresentacao preenche codigo, imagem e revela o quadro Pix", () => {
  const presenterSource = sourceBetween("function presentClientInvoicePix", "async function generateSelectedClientInvoicePix");
  const elements = {
    "#selectedInvoicePixBox": {
      classList: { removed: [], remove(value) { this.removed.push(value); } },
      scrollIntoView() {}
    },
    "#selectedInvoicePixCode": { value: "" },
    "#selectedInvoiceQr": { src: "", onerror: null },
    "#selectedInvoicePixTotalGenerated": { textContent: "" }
  };
  const presentClientInvoicePix = new Function(
    "moneyBR",
    "qrCodeUrl",
    `${presenterSource}; return presentClientInvoicePix;`
  )((value) => `R$ ${Number(value).toFixed(2)}`, (code) => `QR:${code}`);
  const mount = { querySelector: (selector) => elements[selector] || null };
  presentClientInvoicePix(mount, "PIX-COPIA-E-COLA", "", 87.5);
  assert.equal(elements["#selectedInvoicePixCode"].value, "PIX-COPIA-E-COLA");
  assert.equal(elements["#selectedInvoiceQr"].src, "QR:PIX-COPIA-E-COLA");
  assert.equal(elements["#selectedInvoicePixTotalGenerated"].textContent, "R$ 87.50");
  assert.deepEqual(elements["#selectedInvoicePixBox"].classList.removed, ["hidden"]);
});

test("escolha de plano tambem apresenta o Pix antes de salvar remotamente", () => {
  const handler = sourceBetween(
    'mount.querySelector("[data-generate-plan-pix]")?.addEventListener',
    'mount.querySelector("[data-generate-plan-boleto]")?.addEventListener'
  );
  assert.ok(handler.indexOf("presentPlanPix(selection.invoice.pixCode") < handler.indexOf("await saveClientPlanRequest"));
  const selectionBuilder = sourceBetween("function selectedClientPlanPayment", "async function saveClientPlanRequest");
  assert.match(selectionBuilder, /const valorPlano = financePlanValue\(client, tipoPlano\)/);
  assert.match(selectionBuilder, /valorTotal: valorPlano/);

  const selectedClientPlanPayment = new Function(
    "activeClientPlanRequest",
    "financePlanValue",
    "clientPlanPeriod",
    "clientForInvoicePlan",
    "buildClientInvoice",
    "currentMonthKey",
    "state",
    "invoiceDueDateForMonth",
    `${selectionBuilder}; return selectedClientPlanPayment;`
  )(
    () => null,
    () => 87.5,
    () => ({ inicio: "2026-09-01", fim: "2026-10-01" }),
    (client) => ({ ...client, valorPlano: 87.5 }),
    (_client, _month, _config, total) => ({ mes: "2026-09", valorTotal: total, pixCode: `PIX:${total}`, qrUrl: `QR:${total}` }),
    () => "2026-09",
    { pagamentoSistema: { pixChave: "pix@example.com" } },
    () => "2026-09-30"
  );
  const mount = { querySelector: () => ({ value: "mensal" }) };
  const selection = selectedClientPlanPayment({ id: "cliente", tipoPlano: "mensal", valorPlano: 87.5 }, mount);
  assert.equal(selection.valorTotal, 87.5);
  assert.equal(selection.invoice.pixCode, "PIX:87.5");
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

test("plano atual prioriza o valor individual do cliente na geracao Pix", () => {
  const financePlanValueSource = sourceBetween("function financePlanValue", "function syncFinanceRowPlanValue");
  const financePlanValue = new Function(
    "isBillableClientType",
    "defaultPlanValue",
    `${financePlanValueSource}; return financePlanValue;`
  )(() => true, () => 0);
  const client = { tipoCliente: "comercio", tipoPlano: "mensal", valorPlano: 87.5 };
  assert.equal(financePlanValue(client, "mensal"), 87.5);
  assert.equal(financePlanValue(client, "anual"), 0);
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
