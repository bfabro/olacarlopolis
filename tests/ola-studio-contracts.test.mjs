import test from "node:test";
import assert from "node:assert/strict";
import { STUDIO_CAPTION_STYLES, STUDIO_EDIT_STYLES, STUDIO_TEXT_PRESETS, STUDIO_TRANSITIONS, normalizeStudioProject, studioJobCostEstimate, validateEditPlan, validateStudioProject } from "../shared/studio-contracts.mjs";

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

test("Studio Pro oferece oito modelos, biblioteca de transições e seis estilos de texto", () => {
  assert.equal(Object.keys(STUDIO_EDIT_STYLES).length, 8);
  assert.equal(Object.keys(STUDIO_TEXT_PRESETS).length, 6);
  for (const transition of ["fade", "dissolve", "zoomin", "zoomout", "slide", "wipe", "blur", "whip", "flash", "match", "hardcut", "dipblack"]) assert.ok(STUDIO_TRANSITIONS[transition]);
});

test("normalização preserva personalização profissional sem aceitar valores inseguros", () => {
  const project = normalizeStudioProject({ style: "gastronomia", transition: "blur", transitionDuration: 0.8, textDesign: { preset: "promo", animation: "typewriter", sizeScale: 1.4, color: "#ffbb2d", position: "bottom", background: false } });
  assert.equal(project.schemaVersion, 6);
  assert.equal(project.transition, "blur");
  assert.equal(project.textDesign.animation, "typewriter");
  assert.equal(project.textDesign.color, "#FFBB2D");
  assert.equal(project.textDesign.position, "bottom");
});

test("normaliza ritmo e sincronismo musical sem habilitar IA semântica", () => {
  const project = normalizeStudioProject({ editing: { rhythm: "dynamic", syncToMusic: true, prioritizeTechnicalQuality: true } });
  assert.equal(project.editing.rhythm, "dynamic");
  assert.equal(project.editing.syncToMusic, true);
  assert.equal(project.editing.prioritizeTechnicalQuality, true);
});

test("diretor de IA exige seleção explícita e limita o briefing", () => {
  const local = normalizeStudioProject({ director: { mode: "qualquer", brief: "Teste" } });
  const semantic = normalizeStudioProject({ director: { mode: "semantic", brief: "A".repeat(1400) } });
  assert.equal(local.director.mode, "local");
  assert.equal(semantic.director.mode, "semantic");
  assert.equal(semantic.director.brief.length, 1200);
});

test("normaliza áudio e legendas dentro de limites seguros", () => {
  const project = normalizeStudioProject({ captionsEnabled: true, captions: { mode: "dynamic", sizeScale: 4, color: "#ffffff", highlightColor: "#ffbb2d", position: "center", prompt: "Olá Carlópolis", reviewBeforeRender: true }, audio: { musicVolume: 0.9, voiceVolume: 0.2, fadeSeconds: 8, noiseReduction: true } });
  assert.equal(Object.keys(STUDIO_CAPTION_STYLES).length, 2);
  assert.equal(project.captions.mode, "dynamic");
  assert.equal(project.captions.sizeScale, 1.6);
  assert.equal(project.captions.reviewBeforeRender, true);
  assert.equal(project.audio.musicVolume, 0.7);
  assert.equal(project.audio.voiceVolume, 0.5);
  assert.equal(project.audio.fadeSeconds, 5);
  assert.equal(project.audio.noiseReduction, true);
});
