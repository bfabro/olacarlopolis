import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("cliente somente delivery conserva o cadastro e oculta o endereco publico", () => {
  assert.ok(script.includes('function clienteSomenteDeliveryAtivo(cliente = {})'));
  assert.ok(script.includes('normalizeName(cliente.endereco || cliente.address || "") === "somentedelivery"'));
  assert.ok(script.includes('const somenteDelivery = clienteSomenteDeliveryAtivo(cliente);'));
  assert.ok(script.includes('address: somenteDelivery ? "" : (cliente.endereco || "")'));
  assert.ok(script.includes('if (est.somenteDelivery) est.address = "";'));
});

test("aviso somente delivery aparece em vermelho no Onde Comer e na area do cliente", () => {
  assert.ok(script.includes('clienteSomenteDeliveryAtivo(est) ?'));
  assert.ok(script.includes('clienteSomenteDeliveryAtivo(establishment) ?'));
  assert.ok(script.includes('class="onde-comer-endereco endereco-uma-linha somente-delivery-publico"'));
  assert.ok(script.includes('class="info-box somente-delivery-publico"'));
  assert.ok(script.includes('<div class="info-value">Somente delivery</div>'));
  assert.match(style, /\.somente-delivery-publico\s*\{[\s\S]*?color:\s*#d32f2f/);
});
