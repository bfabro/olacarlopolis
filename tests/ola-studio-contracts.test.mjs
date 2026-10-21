import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStudioProject, studioJobCostEstimate, validateEditPlan, validateStudioProject } from "../shared/studio-contracts.mjs";

const source = { id: "media-1", storagePath: "studio/uid/originals/project/video.mp4", contentType: "video/mp4", size: 1024 };

test("normaliza projeto do Studio sem inventar conteúdo", () => {
  const project = normalizeStudioProject({ name: "Campanha", style: "reels", format: "9:16", duration: 15, sources: [source] });
  assert.equal(project.name, "Campanha");
  assert.equal(project.style, "reels");
  assert.equal(project.title, "");
  assert.equal(project.sources.length, 1);
});

test("valida isolamento lógico e limites básicos do projeto", () => {
  assert.equal(validateStudioProject({ name: "Teste", duration: 30, sources: [source] }).valid, true);
  assert.equal(validateStudioProject({ name: "Sem mídia", duration: 30, sources: [] }).valid, false);
});

test("estima créditos sem ativar cobrança", () => {
  const estimate = studioJobCostEstimate({ style: "reels", format: "9:16", duration: 30, sources: [source], captionsEnabled: true });
  assert.ok(estimate.processingUnits > 0);
  assert.ok(estimate.estimatedCredits > 0);
  assert.equal(estimate.formulaVersion, 1);
});

test("contrato do plano rejeita plano sem cenas", () => {
  const result = validateEditPlan({ schemaVersion: 1, style: "reels", format: "9:16", duration: 15, scenes: [] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /cenas/i);
});
