import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainBudgetRecord,
  filterTerrainBudgets,
  formatTerrainBudgetNumber,
  terrainBudgetRecords,
  terrainBudgetStatusMeta,
  terrainBudgetWhatsappUrl
} from "../admin/gestao-terrenos-schema.js";

const baseInput = {
  numero: "ORC-2026-0001",
  owner_id: "owner-1",
  terrain_id: "terrain-1",
  development_id: "development-1",
  data: "2026-08-31",
  validade: "2026-09-15",
  area_m2: 360,
  tipo_servico: "Limpeza de terreno",
  descricao: "Roçada e retirada do material vegetal.",
  valor: 1250.5,
  observacoes: "Acesso pela rua lateral.",
  status: "rascunho"
};

test("gera número automático anual e sequencial", () => {
  assert.equal(formatTerrainBudgetNumber(1, 2026), "ORC-2026-0001");
  assert.equal(formatTerrainBudgetNumber(42, 2026), "ORC-2026-0042");
});

test("cria orçamento completo vinculado ao proprietário e terreno", () => {
  const budget = buildTerrainBudgetRecord(baseInput, { id: "budget-1", timestamp: 1000 });
  assert.equal(budget.id, "budget-1");
  assert.equal(budget.owner_id, "owner-1");
  assert.equal(budget.terrain_id, "terrain-1");
  assert.equal(budget.valor, 1250.5);
  assert.equal(budget.created_at, 1000);
});

test("edita orçamento preservando número e data de criação", () => {
  const existing = buildTerrainBudgetRecord(baseInput, { id: "budget-1", timestamp: 1000 });
  const edited = buildTerrainBudgetRecord({
    ...baseInput,
    numero: existing.numero,
    descricao: "Roçada, retirada e acabamento.",
    valor: 1400,
    status: "enviado"
  }, { id: "budget-1", existing, timestamp: 2000 });
  assert.equal(edited.numero, "ORC-2026-0001");
  assert.equal(edited.created_at, 1000);
  assert.equal(edited.updated_at, 2000);
  assert.equal(edited.status, "enviado");
});

test("rejeita validade anterior à data do orçamento", () => {
  assert.throws(
    () => buildTerrainBudgetRecord({ ...baseInput, validade: "2026-08-30" }, { id: "budget-1" }),
    /validade não pode ser anterior/
  );
});

test("lista por data decrescente e filtra status, período, proprietário e loteamento", () => {
  const records = {
    a: buildTerrainBudgetRecord(baseInput, { id: "a", timestamp: 1 }),
    b: buildTerrainBudgetRecord({
      ...baseInput,
      numero: "ORC-2026-0002",
      owner_id: "owner-2",
      terrain_id: "terrain-2",
      development_id: "",
      data: "2026-09-05",
      validade: "2026-09-20",
      status: "aprovado"
    }, { id: "b", timestamp: 2 })
  };
  assert.deepEqual(terrainBudgetRecords(records).map((budget) => budget.id), ["b", "a"]);
  assert.deepEqual(filterTerrainBudgets(records, { status: "aprovado" }).map((budget) => budget.id), ["b"]);
  assert.deepEqual(filterTerrainBudgets(records, {
    date_from: "2026-08-01",
    date_to: "2026-08-31",
    owner_id: "owner-1",
    development_id: "development-1"
  }).map((budget) => budget.id), ["a"]);
  assert.deepEqual(filterTerrainBudgets(records, {
    development_id: "development-2"
  }, {
    "terrain-2": { id: "terrain-2", development_id: "development-2" }
  }).map((budget) => budget.id), ["b"]);
});

test("reconhece todos os status e cria mensagem de WhatsApp", () => {
  for (const status of ["rascunho", "enviado", "visualizado", "aprovado", "recusado", "expirado"]) {
    assert.equal(terrainBudgetStatusMeta(status).value, status);
  }
  const url = terrainBudgetWhatsappUrl(
    baseInput,
    { nome: "Maria", whatsapp: "(43) 99999-0000" },
    { apelido: "Terreno da Rua A" }
  );
  assert.match(url, /^https:\/\/wa\.me\/5543999990000\?text=/);
  const message = decodeURIComponent(url.split("?text=")[1]);
  assert.match(message, /ORC-2026-0001/);
  assert.match(message, /R\$ 1\.250,50/);
  assert.match(message, /15\/09\/2026/);
});
