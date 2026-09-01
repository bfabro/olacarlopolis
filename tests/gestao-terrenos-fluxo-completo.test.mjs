import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainBudgetRecord,
  buildTerrainDevelopmentRecord,
  buildTerrainInspectionRecord,
  buildTerrainOwnerRecord,
  buildTerrainPhotoRecord,
  buildTerrainRecord,
  buildTerrainReminderSchedule,
  buildTerrainServicePhotoRecord,
  buildTerrainServiceRecord,
  buildTerrainTimelineEvent,
  calculateTerrainDashboard,
  calculateTerrainReports,
  terrainBudgetWhatsappUrl,
  terrainDevelopmentPlanContext,
  terrainInspectionRecords,
  terrainOpportunityRecords,
  terrainOpportunityWhatsappUrl,
  terrainPhotoRecords,
  terrainReminderGroups,
  terrainServiceInputFromBudget,
  terrainServicePhotoRecords,
  terrainStatusAfterInspection,
  terrainTimelineEventId,
  terrainTimelineRecords,
  validateTerrainDevelopmentPlanFile,
  validateTerrainImageFile
} from "../admin/gestao-terrenos-schema.js";

test("fluxo completo da Gestão de Terrenos permanece íntegro", () => {
  const owner = buildTerrainOwnerRecord({
    nome: "Cliente de revisão", telefone: "4335000000", whatsapp: "43999990000",
    endereco: "Rua Um", numero: "10", bairro: "Centro", cidade: "Carlópolis",
    estado: "PR", cep: "86420000", observacoes: "", origem_cliente: "indicacao", status: "ativo"
  }, { id: "owner-1", timestamp: Date.parse("2026-01-01T12:00:00Z") });
  assert.equal(owner.id, "owner-1");

  const development = buildTerrainDevelopmentRecord({
    nome: "Jardim Revisão", bairro: "Centro", cidade: "Carlópolis",
    descricao: "Loteamento do fluxo.", observacoes: "Revisado.",
    planta_imagem_url: "https://example.com/planta.jpg", planta_imagem_path: "planta.jpg",
    planta_pdf_url: "https://example.com/planta.pdf", planta_pdf_path: "planta.pdf"
  }, { id: "dev-1", timestamp: 2 });
  assert.equal(validateTerrainDevelopmentPlanFile({ name: "planta.jpg", type: "image/jpeg", size: 2048 }, "image"), true);

  const terrain = buildTerrainRecord({
    owner_id: owner.id, development_id: development.id, apelido: "Terreno revisão",
    bairro: "Centro", rua: "Rua Dois", numero: "20", quadra: "A", lote: "1",
    area_m2: 500, frente_m: 10, fundo_m: 50, observacoes: "",
    grau_dificuldade: "medio", altura_mato: "de_30_a_60_cm", status: "monitorar",
    latitude: -23.4, longitude: -49.7
  }, { id: "terrain-1", timestamp: Date.parse("2026-01-02T12:00:00Z") });
  assert.equal(terrain.owner_id, owner.id);
  assert.equal(terrainDevelopmentPlanContext(development.id, { [terrain.id]: terrain }, { [owner.id]: owner })[0].lote, "1");

  const image = { name: "terreno.jpg", type: "image/jpeg", size: 4096 };
  assert.equal(validateTerrainImageFile(image), true);
  const generalPhoto = buildTerrainPhotoRecord({
    terrain_id: terrain.id, categoria: "frente", url: "https://example.com/terreno.jpg",
    path: "terreno.jpg", created_by_uid: "master-1", created_by_name: "Admin Master"
  }, { id: "photo-1", timestamp: 3 });
  assert.equal(terrainPhotoRecords({ [generalPhoto.id]: generalPhoto }, terrain.id).length, 1);

  const inspection = buildTerrainInspectionRecord({
    terrain_id: terrain.id, data: "2026-02-01", hora: "09:00", responsavel_uid: "master-1",
    responsavel_nome: "Admin Master", responsavel_email: "master@example.com",
    situacao_atual: "precisa_limpeza", altura_mato: "de_60_cm_a_1_m", grau_dificuldade: "medio",
    observacoes: "Limpeza recomendada.", precisa_limpeza: true, recomendar_contato: true,
    fotos: { i1: { url: "https://example.com/vistoria.jpg", path: "vistoria.jpg" } }
  }, { id: "inspection-1", timestamp: 4 });
  assert.equal(terrainInspectionRecords({ [inspection.id]: inspection }, terrain.id)[0].id, inspection.id);
  assert.equal(terrainStatusAfterInspection(terrain.status, inspection), "precisa_limpeza");

  const draftBudget = buildTerrainBudgetRecord({
    numero: "ORC-2026-0001", owner_id: owner.id, terrain_id: terrain.id,
    development_id: development.id, data: "2026-02-02", validade: "2026-02-12",
    area_m2: 500, tipo_servico: "Limpeza completa", descricao: "Limpeza do lote.",
    valor: 1500, observacoes: "", status: "rascunho"
  }, { id: "budget-1", timestamp: 5 });
  const approvedBudget = buildTerrainBudgetRecord({ ...draftBudget, status: "aprovado" }, {
    id: draftBudget.id, existing: draftBudget, timestamp: 6
  });
  assert.equal(approvedBudget.status, "aprovado");
  assert.match(terrainBudgetWhatsappUrl(approvedBudget, owner, terrain), /^https:\/\/wa\.me\//);

  const serviceInput = terrainServiceInputFromBudget(approvedBudget, terrain, "2026-02-05");
  const scheduledService = buildTerrainServiceRecord({
    ...serviceInput, horario: "08:00", equipamentos: "Roçadeira", responsaveis: "Equipe A",
    tempo_gasto: "", custo: 400, forma_pagamento: "pix", status_pagamento: "pendente", status: "agendado"
  }, { id: "service-1", timestamp: 7, today: "2026-02-05" });
  assert.equal(scheduledService.budget_id, approvedBudget.id);

  const before = buildTerrainServicePhotoRecord({
    service_id: scheduledService.id, terrain_id: terrain.id, tipo: "antes",
    url: "https://example.com/antes.jpg", path: "antes.jpg"
  }, { id: "before-1", timestamp: 8 });
  const after = buildTerrainServicePhotoRecord({
    service_id: scheduledService.id, terrain_id: terrain.id, tipo: "depois",
    url: "https://example.com/depois.jpg", path: "depois.jpg"
  }, { id: "after-1", timestamp: 9 });
  const servicePhotos = { [before.id]: before, [after.id]: after };
  assert.equal(terrainServicePhotoRecords(servicePhotos, scheduledService.id, "antes").length, 1);
  assert.equal(terrainServicePhotoRecords(servicePhotos, scheduledService.id, "depois").length, 1);

  const completedService = buildTerrainServiceRecord({
    ...scheduledService, data_realizada: "2026-02-05", tempo_gasto: "3h",
    valor_recebido: 1500, custo: 400, forma_pagamento: "pix",
    status_pagamento: "pago", data_pagamento: "2026-02-05", status: "concluido"
  }, { id: scheduledService.id, existing: scheduledService, timestamp: 10, today: "2026-02-05" });
  assert.equal(completedService.status, "concluido");
  assert.equal(completedService.status_pagamento, "pago");
  assert.equal(completedService.saldo, 0);

  const reminder = buildTerrainReminderSchedule(completedService.data_realizada, "30");
  const cleanTerrain = { ...terrain, status: "limpo", ultima_limpeza_em: "2026-02-05", ...reminder };
  assert.equal(terrainReminderGroups({ [terrain.id]: cleanTerrain }, "2026-03-07").hoje[0].id, terrain.id);

  const data = {
    owners: { [owner.id]: owner }, developments: { [development.id]: development },
    terrains: { [terrain.id]: { ...cleanTerrain, status: "precisa_limpeza" } },
    photos: { [generalPhoto.id]: generalPhoto }, inspections: { [inspection.id]: inspection },
    budgets: { [approvedBudget.id]: approvedBudget }, services: { [completedService.id]: completedService },
    servicePhotos, timeline: {}
  };
  const opportunities = terrainOpportunityRecords(data, "2026-03-07");
  assert.equal(opportunities[0].terrain_id, terrain.id);
  assert.match(terrainOpportunityWhatsappUrl(opportunities[0]), /^https:\/\/wa\.me\//);

  const timelineTypes = [
    "terrain_created", "owner_linked", "photo_added", "inspection_completed", "budget_created",
    "budget_sent", "budget_approved", "service_scheduled", "service_completed", "payment_recorded",
    "reminder_created", "contact_recorded", "status_changed"
  ];
  timelineTypes.forEach((type, index) => {
    const id = terrainTimelineEventId(terrain.id, type, `ref-${index}`);
    data.timeline[id] = buildTerrainTimelineEvent({
      terrain_id: terrain.id, data: "2026-03-07", hora: `09:${String(index).padStart(2, "0")}`,
      tipo: type, descricao: `Evento ${type}.`, referencia_tipo: "terreno", referencia_id: terrain.id
    }, { id, timestamp: 20 + index });
  });
  assert.equal(terrainTimelineRecords(data.timeline, terrain.id).length, timelineTypes.length);

  const dashboard = calculateTerrainDashboard(data, "2026-03-07");
  const reports = calculateTerrainReports(data, {
    date_from: "2026-01-01", date_to: "2026-03-31", today: "2026-03-07"
  });
  assert.equal(dashboard.total_terrains, 1);
  assert.equal(dashboard.open_opportunities, 1);
  assert.equal(reports.services.count, 1);
  assert.equal(reports.budgets.approved, 1);
  assert.equal(reports.finance.billing, 1500);
});
