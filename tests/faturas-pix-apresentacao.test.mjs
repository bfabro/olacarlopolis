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
