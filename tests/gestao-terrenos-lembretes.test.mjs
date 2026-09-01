import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainReminderSchedule,
  terrainAddDays,
  terrainReminderAutomaticStatus,
  terrainReminderClassification,
  terrainReminderGroups
} from "../admin/gestao-terrenos-schema.js";

test("calcula a próxima vistoria pelos intervalos disponíveis", () => {
  assert.equal(terrainAddDays("2026-09-01", 30), "2026-10-01");
  const schedule = buildTerrainReminderSchedule("2026-09-01", "45");
  assert.equal(schedule.intervalo_vistoria, "45");
  assert.equal(schedule.proxima_vistoria_em, "2026-10-16");
});

test("data personalizada tem prioridade sobre o intervalo", () => {
  const schedule = buildTerrainReminderSchedule("2026-09-01", "30", "2026-12-20");
  assert.equal(schedule.intervalo_vistoria, "personalizado");
  assert.equal(schedule.proxima_vistoria_em, "2026-12-20");
  assert.equal(schedule.proxima_vistoria_personalizada, "2026-12-20");
});

test("valida a data personalizada", () => {
  assert.throws(() => buildTerrainReminderSchedule("2026-09-01", "personalizado", ""), /Informe a data personalizada/);
  assert.throws(() => buildTerrainReminderSchedule("2026-09-01", "personalizado", "2026-08-31"), /não pode ser anterior/);
});

test("classifica e define o status automático nos limites de dias", () => {
  const terrain = { ultima_limpeza_em: "2026-01-01" };
  assert.deepEqual(terrainReminderClassification(terrain, "2026-01-31"), { key: "recent", label: "Limpo recentemente", status: "limpo", elapsedDays: 30 });
  assert.equal(terrainReminderClassification(terrain, "2026-02-01").status, "monitorar");
  assert.equal(terrainReminderClassification(terrain, "2026-03-02").status, "monitorar");
  assert.equal(terrainReminderClassification(terrain, "2026-03-03").status, "pode_precisar_limpeza");
  assert.equal(terrainReminderClassification(terrain, "2026-04-02").status, "precisa_limpeza");
  assert.equal(terrainReminderAutomaticStatus({ ...terrain, status: "limpo" }, "2026-02-01"), "monitorar");
  assert.equal(terrainReminderAutomaticStatus({ ...terrain, status: "precisa_limpeza" }, "2026-02-01"), "precisa_limpeza");
  assert.equal(terrainReminderAutomaticStatus({ ...terrain, status: "servico_agendado" }, "2026-04-02"), "servico_agendado");
});

test("separa hoje, atrasados, próximos 7 e próximos 30 dias", () => {
  const base = { ultima_limpeza_em: "2026-08-01", status: "limpo" };
  const groups = terrainReminderGroups({
    today: { id: "today", ...base, proxima_vistoria_em: "2026-09-01" },
    late: { id: "late", ...base, proxima_vistoria_em: "2026-08-31" },
    soon: { id: "soon", ...base, proxima_vistoria_em: "2026-09-08" },
    month: { id: "month", ...base, proxima_vistoria_em: "2026-09-30" },
    later: { id: "later", ...base, proxima_vistoria_em: "2026-10-02" },
    inactive: { id: "inactive", ...base, status: "inativo", proxima_vistoria_em: "2026-09-01" }
  }, "2026-09-01");
  assert.deepEqual(groups.hoje.map((item) => item.id), ["today"]);
  assert.deepEqual(groups.atrasados.map((item) => item.id), ["late"]);
  assert.deepEqual(groups.proximos_7_dias.map((item) => item.id), ["soon"]);
  assert.deepEqual(groups.proximos_30_dias.map((item) => item.id), ["month"]);
});
