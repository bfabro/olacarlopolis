import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTerrainDashboard,
  calculateTerrainReports,
  calculateTerrainRevenueForecast
} from "../admin/gestao-terrenos-schema.js";

const timestamp = (date) => Date.parse(`${date}T12:00:00Z`);

function realFlowData() {
  return {
    owners: {
      o1: { id: "o1", nome: "Ana", status: "ativo", created_at: timestamp("2026-08-10") },
      o2: { id: "o2", nome: "Beto", status: "inativo", created_at: timestamp("2025-12-01") }
    },
    developments: { d1: { id: "d1", nome: "Jardim Central" } },
    terrains: {
      t1: { id: "t1", owner_id: "o1", development_id: "d1", apelido: "Terreno A", bairro: "Centro", area_m2: 500, status: "monitorar", ultima_limpeza_em: "2026-08-01", intervalo_vistoria: "30", proxima_vistoria_em: "2026-09-01", created_at: timestamp("2026-08-11") },
      t2: { id: "t2", owner_id: null, development_id: null, apelido: "Terreno B", bairro: "Vista Alegre", area_m2: 300, status: "sem_informacao", created_at: timestamp("2026-07-05") }
    },
    budgets: {
      b1: { id: "b1", owner_id: "o1", terrain_id: "t1", numero: "ORC-1", data: "2026-08-15", valor: 1200, status: "aprovado" },
      b2: { id: "b2", owner_id: "o1", terrain_id: "t1", numero: "ORC-2", data: "2026-08-20", valor: 900, status: "enviado" },
      b3: { id: "b3", owner_id: "o1", terrain_id: "t1", numero: "ORC-3", data: "2026-08-21", valor: 700, status: "recusado" }
    },
    services: {
      s1: { id: "s1", owner_id: "o1", terrain_id: "t1", status: "concluido", status_pagamento: "pago", data_prevista: "2026-07-01", data_realizada: "2026-07-01", area_m2: 500, valor_cobrado: 1000, valor_recebido: 1000, saldo: 0, custo: 250, tempo_gasto: "02:00" },
      s2: { id: "s2", owner_id: "o1", terrain_id: "t1", status: "concluido", status_pagamento: "parcial", data_prevista: "2026-08-01", data_realizada: "2026-08-01", area_m2: 500, valor_cobrado: 1200, valor_recebido: 700, saldo: 500, custo: 300, tempo_gasto: "3h" },
      s3: { id: "s3", owner_id: "o1", terrain_id: "t1", status: "agendado", status_pagamento: "pendente", data_prevista: "2026-09-10", horario: "08:30", area_m2: 500, valor_cobrado: 1300, valor_recebido: 0, saldo: 1300, custo: 0 }
    },
    inspections: {},
    timeline: {
      e1: { id: "e1", terrain_id: "t1", tipo: "budget_sent", referencia_id: "b1", data: "2026-08-15", hora: "09:00" },
      e2: { id: "e2", terrain_id: "t1", tipo: "budget_sent", referencia_id: "b2", data: "2026-08-20", hora: "09:00" },
      e3: { id: "e3", terrain_id: "t1", tipo: "budget_sent", referencia_id: "b3", data: "2026-08-21", hora: "09:00" }
    }
  };
}

test("dashboard consolida agenda, financeiro e oportunidades reais do módulo", () => {
  const dashboard = calculateTerrainDashboard(realFlowData(), "2026-09-01");
  assert.equal(dashboard.total_terrains, 2);
  assert.equal(dashboard.total_owners, 2);
  assert.equal(dashboard.terrains_to_verify, 1);
  assert.equal(dashboard.scheduled_services, 1);
  assert.equal(dashboard.pending_budgets, 1);
  assert.equal(dashboard.pending_values, 1800);
  assert.equal(dashboard.today_terrains[0].id, "t1");
  assert.equal(dashboard.upcoming_services[0].id, "s3");
});

test("relatórios respeitam período e calculam médias e conversão", () => {
  const report = calculateTerrainReports(realFlowData(), {
    date_from: "2026-07-01", date_to: "2026-08-31", today: "2026-09-01"
  });
  assert.equal(report.clients.active, 1);
  assert.equal(report.clients.new, 1);
  assert.equal(report.clients.recurring, 1);
  assert.equal(report.clients.inactive, 1);
  assert.equal(report.terrains.total, 2);
  assert.equal(report.terrains.total_area, 800);
  assert.equal(report.terrains.without_owner, 1);
  assert.deepEqual(report.terrains.by_neighborhood, { Centro: 1, "Vista Alegre": 1 });
  assert.equal(report.services.count, 2);
  assert.equal(report.services.total_area, 1000);
  assert.equal(report.services.average_ticket, 1100);
  assert.equal(report.services.average_per_m2, 2.2);
  assert.equal(report.services.average_minutes, 150);
  assert.equal(report.services.average_cleaning_interval_days, 31);
  assert.equal(report.budgets.sent, 3);
  assert.equal(report.budgets.approved, 1);
  assert.equal(report.budgets.refused, 1);
  assert.equal(report.budgets.pending, 1);
  assert.ok(Math.abs(report.budgets.conversion_rate - 33.333333) < 0.001);
  assert.equal(report.budgets.quoted_value, 2800);
  assert.equal(report.budgets.approved_value, 1200);
  assert.equal(report.finance.billing, 2200);
  assert.equal(report.finance.costs, 550);
  assert.equal(report.finance.profit, 1650);
  assert.equal(report.finance.pending, 500);
});

test("receita potencial usa intervalo, última limpeza e valores anteriores", () => {
  const forecast = calculateTerrainRevenueForecast(realFlowData(), "2026-09-01");
  assert.equal(forecast.predictions.length, 3);
  assert.equal(forecast.predictions[0].expected_date, "2026-09-01");
  assert.equal(forecast.predictions[0].average_interval_days, 31);
  assert.equal(forecast.predictions[0].estimated_value, 1100);
  assert.equal(forecast.next_30_days, 1100);
  assert.equal(forecast.next_60_days, 2200);
  assert.equal(forecast.next_90_days, 3300);
  assert.deepEqual(forecast.by_month, { "2026-09": 1100, "2026-10": 1100, "2026-11": 1100 });
});

test("previsão não inventa receita sem intervalo ou histórico de valor", () => {
  const forecast = calculateTerrainRevenueForecast({
    terrains: { t1: { id: "t1", ultima_limpeza_em: "2026-08-01" } },
    services: {}
  }, "2026-09-01");
  assert.equal(forecast.predictions.length, 0);
  assert.equal(forecast.next_90_days, 0);
});
