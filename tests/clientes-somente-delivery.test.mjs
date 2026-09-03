import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");

test("cliente somente delivery conserva o cadastro e oculta o endereco publico", () => {
  assert.ok(script.includes('const somenteDelivery = Boolean(cliente.somenteDelivery || cliente.deliveryOnly);'));
  assert.ok(script.includes('address: somenteDelivery ? "" : (cliente.endereco || "")'));
  assert.ok(script.includes('if (est.somenteDelivery) est.address = "";'));
  assert.ok(script.includes('establishment.address && !establishment.somenteDelivery'));
  assert.ok(script.includes('est.address && !est.somenteDelivery'));
});
