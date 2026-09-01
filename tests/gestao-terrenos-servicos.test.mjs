import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainRecord,
  buildTerrainServicePhotoRecord,
  buildTerrainServiceRecord,
  terrainServiceInputFromBudget,
  terrainServicePhotoRecords,
  terrainServicePhotoStoragePath,
  terrainServiceStatusMeta,
  terrainServiceTypeLabel
} from "../admin/gestao-terrenos-schema.js";

const image = { name: "Antes Serviço.jpg", type: "image/jpeg", size: 2048 };
const base = {
  owner_id: "owner-1", terrain_id: "terrain-1", budget_id: "budget-1",
  data_prevista: "2026-09-01", data_realizada: "", horario: "08:00", area_m2: 350,
  tipo_servico: "rocada", equipamentos: "Roçadeira", responsaveis: "João e Carlos",
  tempo_gasto: "", valor_cobrado: 1200, custo: 400, forma_pagamento: "Pix",
  status_pagamento: "pendente", status: "agendado", observacoes: "Acesso lateral"
};

test("converte orçamento aprovado reaproveitando os dados", () => {
  const input = terrainServiceInputFromBudget({
    id: "budget-1", owner_id: "owner-1", terrain_id: "terrain-1",
    area_m2: 350, tipo_servico: "Limpeza completa", valor: 1200,
    descricao: "Limpar toda a área", observacoes: "Retirar resíduos"
  }, { id: "terrain-1" }, "2026-09-01");
  assert.equal(input.budget_id, "budget-1");
  assert.equal(input.tipo_servico, "limpeza_completa");
  assert.equal(input.valor_cobrado, 1200);
  assert.match(input.observacoes, /Retirar resíduos/);
});

test("cria serviço e calcula lucro estimado", () => {
  const service = buildTerrainServiceRecord(base, { id: "service-1", timestamp: 100 });
  assert.equal(service.lucro_estimado, 800);
  assert.equal(service.status, "agendado");
  assert.equal(terrainServiceTypeLabel(service.tipo_servico), "Roçada");
});

test("conclusão registra data realizada", () => {
  const service = buildTerrainServiceRecord({ ...base, status: "concluido" }, {
    id: "service-1", timestamp: 200, today: "2026-09-03"
  });
  assert.equal(service.data_realizada, "2026-09-03");
  assert.equal(terrainServiceStatusMeta(service.status).label, "Concluído");
});

test("organiza múltiplas fotos antes e depois", () => {
  assert.equal(
    terrainServicePhotoStoragePath("terrain-1", "service-1", "antes", image, 123, 0),
    "gestao-terrenos/terrenos/terrain-1/servicos/service-1/antes/123-0-antes-servico-jpg"
  );
  const records = {
    a: buildTerrainServicePhotoRecord({ service_id: "service-1", terrain_id: "terrain-1", tipo: "antes", url: "a", path: "a" }, { id: "a", timestamp: 1 }),
    b: buildTerrainServicePhotoRecord({ service_id: "service-1", terrain_id: "terrain-1", tipo: "depois", url: "b", path: "b" }, { id: "b", timestamp: 2 })
  };
  assert.deepEqual(terrainServicePhotoRecords(records, "service-1", "antes").map((photo) => photo.id), ["a"]);
  assert.deepEqual(terrainServicePhotoRecords(records, "service-1", "depois").map((photo) => photo.id), ["b"]);
});

test("edição posterior do terreno preserva a última limpeza", () => {
  const terrainInput = {
    apelido: "Lote 1", bairro: "Centro", rua: "Rua A", numero: "10", quadra: "A", lote: "1",
    area_m2: 350, frente_m: 10, fundo_m: 35, observacoes: "", grau_dificuldade: "facil",
    altura_mato: "ate_30_cm", status: "limpo"
  };
  const terrain = buildTerrainRecord(terrainInput, {
    id: "terrain-1", existing: { created_at: 1, ultima_limpeza_em: "2026-09-03" }, timestamp: 2
  });
  assert.equal(terrain.ultima_limpeza_em, "2026-09-03");
});
