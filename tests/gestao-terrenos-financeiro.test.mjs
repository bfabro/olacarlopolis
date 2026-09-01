import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainServiceRecord,
  calculateTerrainFinance,
  terrainPaymentMethodLabel,
  terrainPaymentStatusMeta
} from "../admin/gestao-terrenos-schema.js";

const base = {
  owner_id: "owner-1", terrain_id: "terrain-1", budget_id: "",
  data_prevista: "2026-09-10", data_realizada: "", horario: "08:00", area_m2: 100,
  tipo_servico: "rocada", equipamentos: "Roçadeira", responsaveis: "Equipe A", tempo_gasto: "3h",
  valor_cobrado: 1000, valor_recebido: 0, custo: 300, forma_pagamento: "Pix",
  status_pagamento: "pendente", data_pagamento: "", observacoes_pagamento: "",
  status: "concluido", observacoes: ""
};

test("registra pagamento e calcula saldo e status automaticamente", () => {
  const partial = buildTerrainServiceRecord({ ...base, valor_recebido: 400 }, { id: "service-1", timestamp: 1 });
  assert.equal(partial.forma_pagamento, "pix");
  assert.equal(partial.status_pagamento, "parcial");
  assert.equal(partial.saldo, 600);
  assert.equal(partial.lucro_estimado, 700);
  assert.equal(terrainPaymentMethodLabel(partial.forma_pagamento), "Pix");
  assert.equal(terrainPaymentStatusMeta(partial.status_pagamento).label, "Parcial");

  const paid = buildTerrainServiceRecord({ ...base, valor_recebido: 1000 }, { id: "service-2", timestamp: 2 });
  assert.equal(paid.status_pagamento, "pago");
  assert.equal(paid.saldo, 0);
});

test("preserva cancelamento e impede recebimento acima do total", () => {
  const canceled = buildTerrainServiceRecord({ ...base, status_pagamento: "cancelado" }, { id: "service-1", timestamp: 1 });
  assert.equal(canceled.status_pagamento, "cancelado");
  assert.throws(
    () => buildTerrainServiceRecord({ ...base, valor_recebido: 1000.01 }, { id: "service-2", timestamp: 2 }),
    /não pode ser maior/
  );
});

test("calcula indicadores mensais, anuais e pendências", () => {
  const services = {
    partial: { id: "partial", ...base, valor_recebido: 600, saldo: 400, status_pagamento: "parcial" },
    paid: { id: "paid", ...base, terrain_id: "terrain-2", data_realizada: "2026-09-15", area_m2: 50, valor_cobrado: 500, valor_recebido: 500, saldo: 0, custo: 100, status_pagamento: "pago" },
    august: { id: "august", ...base, data_prevista: "2026-08-20", area_m2: 70, valor_cobrado: 700, valor_recebido: 700, saldo: 0, custo: 200, status_pagamento: "pago" },
    canceled: { id: "canceled", ...base, valor_cobrado: 9000, saldo: 9000, status_pagamento: "cancelado" }
  };
  const finance = calculateTerrainFinance(services, { year: "2026", month: "09", paymentStatus: "todos" });
  assert.equal(finance.faturamento_mes, 1500);
  assert.equal(finance.faturamento_anual, 2200);
  assert.equal(finance.valores_pagos, 1100);
  assert.equal(finance.valores_pendentes, 400);
  assert.equal(finance.custos, 400);
  assert.equal(finance.lucro_estimado, 1100);
  assert.equal(finance.ticket_medio, 750);
  assert.equal(finance.valor_medio_m2, 10);
  assert.deepEqual(finance.pendingRecords.map((service) => service.id), ["partial"]);
});

test("aplica filtro por status de pagamento", () => {
  const services = {
    partial: { id: "partial", ...base, valor_recebido: 300, saldo: 700, status_pagamento: "parcial" },
    paid: { id: "paid", ...base, valor_recebido: 1000, saldo: 0, status_pagamento: "pago" }
  };
  const finance = calculateTerrainFinance(services, { year: "2026", month: "09", paymentStatus: "parcial" });
  assert.equal(finance.records.length, 1);
  assert.equal(finance.faturamento_mes, 1000);
  assert.equal(finance.valores_pendentes, 700);
});
