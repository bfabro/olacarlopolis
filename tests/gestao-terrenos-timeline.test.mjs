import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainTimelineEvent,
  terrainTimelineEventId,
  terrainTimelineRecords,
  terrainTimelineTypeMeta
} from "../admin/gestao-terrenos-schema.js";

const flow = [
  ["terrain_created", "terreno", "terreno-1"],
  ["owner_linked", "proprietario", "owner-1"],
  ["owner_changed", "proprietario", "owner-2"],
  ["inspection_completed", "vistoria", "vistoria-1"],
  ["photo_added", "foto", "foto-1"],
  ["budget_created", "orcamento", "orcamento-1"],
  ["budget_sent", "orcamento", "orcamento-1"],
  ["budget_approved", "orcamento", "orcamento-1"],
  ["service_scheduled", "servico", "servico-1"],
  ["service_completed", "servico", "servico-1"],
  ["payment_recorded", "pagamento", "servico-1"],
  ["reminder_created", "lembrete", "servico-1"],
  ["contact_recorded", "contato", "owner-2"],
  ["status_changed", "terreno", "terreno-1"]
];

test("timeline registra e ordena um fluxo completo do terreno", () => {
  const records = {};
  flow.forEach(([type, referenceType, referenceId], index) => {
    const qualifier = ["owner_changed", "payment_recorded", "contact_recorded", "status_changed"].includes(type)
      ? String(index)
      : "";
    const id = terrainTimelineEventId("terreno-1", type, referenceId, qualifier);
    records[id] = buildTerrainTimelineEvent({
      terrain_id: "terreno-1",
      data: `2026-09-${String(index + 1).padStart(2, "0")}`,
      hora: "10:30",
      tipo: type,
      descricao: `Evento ${type}`,
      referencia_tipo: referenceType,
      referencia_id: referenceId
    }, { id, timestamp: index + 1 });
  });

  const timeline = terrainTimelineRecords(records, "terreno-1");
  assert.equal(timeline.length, flow.length);
  assert.equal(timeline[0].tipo, "status_changed");
  assert.equal(timeline.at(-1).tipo, "terrain_created");
  assert.equal(timeline[0].referencia_id, "terreno-1");
  flow.forEach(([type]) => assert.ok(terrainTimelineTypeMeta(type).label));
});

test("id deterministico evita duplicar o mesmo evento", () => {
  const first = terrainTimelineEventId("terreno-1", "budget_sent", "orcamento-1");
  const repeated = terrainTimelineEventId("terreno-1", "budget_sent", "orcamento-1");
  assert.equal(first, repeated);

  const records = {};
  [first, repeated].forEach((id) => {
    records[id] = buildTerrainTimelineEvent({
      terrain_id: "terreno-1", data: "2026-09-01", hora: "09:00",
      tipo: "budget_sent", descricao: "Orçamento enviado.",
      referencia_tipo: "orcamento", referencia_id: "orcamento-1"
    }, { id, timestamp: 1 });
  });
  assert.equal(terrainTimelineRecords(records, "terreno-1").length, 1);
});

test("ocorrencias financeiras diferentes permanecem no histórico", () => {
  const partial = terrainTimelineEventId("terreno-1", "payment_recorded", "servico-1", "5000");
  const paid = terrainTimelineEventId("terreno-1", "payment_recorded", "servico-1", "10000");
  assert.notEqual(partial, paid);
});
