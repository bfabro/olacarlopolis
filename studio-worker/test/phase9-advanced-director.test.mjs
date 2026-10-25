import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildAnalysisCache, probeMedia, sourceAnalysisSignature, summarizeCameraMotion } from "../src/analyzer.mjs";
import { buildTemporalCandidates } from "../src/ai-planner.mjs";
import { chronologicalAdvancedSelections, mergeAdvancedDirection } from "../src/advanced-director.mjs";
import { compareDirectorPlans } from "../src/evaluation.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { buildPhotoMotionFilter, renderPlan } from "../src/renderer.mjs";
import { inspectPlanConsistency, inspectRenderedOutput } from "../src/render-quality.mjs";
import { detectMusicalStructure } from "../src/rhythm.mjs";
import { runProcess } from "../src/process-utils.mjs";

const integrationEnabled = process.env.STUDIO_INTEGRATION === "1";

const sources = [
  { id: "photo", name: "fachada.jpg", storagePath: "studio/u/originals/fachada.jpg", size: 1234, order: 0, contentType: "image/jpeg", metadata: { duration: 0, hasVideo: true, hasAudio: false, orientation: "landscape" }, technical: { analysisMethod: "still-image", sceneTimes: [0], silences: [], qualityWindows: [{ start: 0, end: 15, score: 0.9, flags: [] }], waveform: { available: false, samples: [] } } },
  { id: "video", name: "atendimento.mp4", storagePath: "studio/u/originals/atendimento.mp4", size: 5678, order: 1, contentType: "video/mp4", metadata: { duration: 20, hasVideo: true, hasAudio: true, orientation: "portrait" }, technical: { analysisMethod: "fixture", sceneTimes: [0, 5, 10, 15], silences: [{ start: 0, end: 2 }], cameraMotion: { direction: "right", confidence: 0.8 }, qualityWindows: Array.from({ length: 20 }, (_, index) => ({ start: index, end: index + 1, score: 0.7 + (index % 3) * 0.05, motion: 0.04, flags: [] })), waveform: { available: false, samples: [] } } }
];

test("v44 distribui evidências temporais e registra cache estável", () => {
  const candidates = buildTemporalCandidates(sources, 12);
  assert.ok(candidates.filter((item) => item.sourceId === "video").length >= 4);
  assert.ok(new Set(candidates.filter((item) => item.sourceId === "video").map((item) => item.temporalPhase)).size >= 3);
  const signature = sourceAnalysisSignature(sources[0]);
  assert.equal(signature.length, 24);
  assert.ok(buildAnalysisCache(sources)[signature].technical);
  assert.equal(summarizeCameraMotion([{ x: 0, y: 0, jitter: 0 }, { x: 8, y: 1, jitter: 2 }]).direction, "right");
});

test("v44 monta plano avançado global sem inventar origem ou intervalo", () => {
  const project = { style: "institucional", format: "9:16", duration: 15, transition: "auto", transitionDuration: 0.3, editing: { rhythm: "balanced", syncToMusic: false }, audio: {}, narration: { generateScript: true, enabled: true } };
  const base = createDeterministicPlan(project, sources);
  const candidates = buildTemporalCandidates(sources, 12);
  const evidence = { candidates, frames: candidates.slice(0, 6).map((item) => ({ ...item, dataUrl: "data:image/jpeg;base64,AA==" })), transcripts: [], warnings: [] };
  const direction = { objective: "Apresentar a empresa", identifiedTheme: "atendimento", narrativeProposal: "fachada, atendimento e fechamento", scenes: base.scenes.map((_, index) => ({ candidateId: candidates[index % candidates.length].id, narrativeRole: index === 0 ? "opening" : index === base.scenes.length - 1 ? "closing" : "development", transition: "dissolve", selectionReason: "continuidade visual", continuityIntent: "avançar do exterior ao atendimento", narrativeRelevance: 0.86, intentionalException: "none", containsPerson: false, onScreenText: "Atendimento próximo", narrationText: "Conheça um atendimento próximo.", highlightType: "keyword", textPosition: "top", textAnimation: "fade", highlightDuration: 3, photoMotion: "zoom_in", focusX: 0.5, focusY: 0.5 })), narration: { script: "Conheça um atendimento próximo.", tone: "warm" }, rhythm: { pace: "balanced", musicDirection: "crescimento suave" }, closingProposal: "encerrar com marca", rationale: "seleção temporal", confidence: 0.88 };
  const advanced = mergeAdvancedDirection(base, direction, evidence, sources, { provider: "test", model: "fixture" });
  assert.equal(advanced.planner.type, "advanced-semantic-ai");
  assert.equal(advanced.planner.temporalAnalysis, true);
  assert.ok(advanced.scenes.every((scene) => sources.some((source) => source.id === scene.sourceId)));
  assert.ok(advanced.scenes.every((scene) => scene.start >= 0));
  assert.ok(buildPhotoMotionFilter({ duration: 4, photoMotion: { type: "pan_right", scale: 1.12 } }, 1080, 1920, 30).includes("zoompan"));
  assert.equal(inspectPlanConsistency(advanced).errors.length, 0);
  const comparison = compareDirectorPlans(base, advanced);
  assert.equal(comparison.advanced.planner, "advanced-semantic-ai");
  assert.ok(comparison.humanRubric.length >= 6);
});

test("v46 mantém cortes em ordem cronológica e ativa legenda ao detectar fala", () => {
  const project = { style: "institucional", format: "9:16", duration: 15, transition: "auto", transitionDuration: 0.3, editing: { rhythm: "balanced", syncToMusic: false }, audio: {}, captionsEnabled: false, captions: {}, narration: { generateScript: false, enabled: false } };
  const base = createDeterministicPlan(project, sources);
  const candidates = buildTemporalCandidates(sources, 20);
  const videoCandidates = candidates.filter((item) => item.sourceId === "video");
  const evidence = { candidates, frames: [], transcripts: [{ sourceId: "video", text: "Olá, este é o atendimento.", segments: [{ start: 0, end: 18, text: "Olá, este é o atendimento." }] }], warnings: [] };
  const sceneFor = (candidate) => ({ candidateId: candidate.id, narrativeRole: "development", transition: "dissolve", selectionReason: "fala relevante", continuityIntent: "preservar a fala", narrativeRelevance: 0.9, intentionalException: "flashback", containsPerson: true, onScreenText: "não exibir", narrationText: "não narrar", highlightType: "none", textPosition: "top", textAnimation: "fade", highlightDuration: 2, photoMotion: "zoom_in", focusX: 0.5, focusY: 0.5 });
  const direction = { objective: "Depoimento", identifiedTheme: "atendimento", narrativeProposal: "fala em ordem", scenes: [...videoCandidates].reverse().map(sceneFor), narration: { script: "", tone: "warm" }, rhythm: { pace: "balanced", musicDirection: "suave" }, closingProposal: "encerrar", rationale: "fala real", confidence: 0.9 };
  const ordered = chronologicalAdvancedSelections(direction, evidence, base.scenes.length);
  ordered.forEach((entry, index) => {
    if (!index) return;
    const previous = ordered[index - 1].candidate;
    assert.ok(entry.candidate.sourceIndex > previous.sourceIndex || entry.candidate.sourceIndex === previous.sourceIndex && entry.candidate.start >= previous.start);
  });
  const advanced = mergeAdvancedDirection(base, direction, evidence, sources, { provider: "test", model: "fixture" });
  assert.equal(advanced.captions.requested, true);
  assert.equal(advanced.captions.automaticSpeech, true);
  assert.ok(advanced.scenes.some((scene) => scene.hasSpeech));
  assert.ok(advanced.scenes.filter((scene) => scene.hasSpeech).every((scene) => scene.onScreenText === "" && scene.narrationText === ""));
});

test("v44 identifica estrutura musical sem afirmar avaliação subjetiva", () => {
  const energies = Array.from({ length: 240 }, (_, index) => index < 60 ? 0.08 : index < 120 ? 0.18 : index < 180 ? 0.5 : 0.12);
  const structure = detectMusicalStructure(energies, 50);
  assert.equal(structure.available, true);
  assert.ok(structure.sections.some((section) => section.role === "peak"));
  assert.equal(structure.method, "pcm-energy-sections-v1");
});

test("v44 renderiza movimento contínuo em fotografia e valida o MP4", { skip: !integrationEnabled, timeout: 120000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-v44-photo-"));
  try {
    const imagePath = path.join(root, "photo.png");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc2=s=720x1280:d=1", "-frames:v", "1", imagePath]);
    const source = { id: "photo", order: 0, localPath: imagePath, contentType: "image/png", metadata: { duration: 0, hasVideo: true, hasAudio: false, orientation: "portrait" }, technical: { qualityWindows: [{ start: 0, end: 15, score: 0.9, flags: [] }], sceneTimes: [0], silences: [], waveform: { available: false, samples: [] } } };
    const project = { style: "institucional", format: "9:16", duration: 3, transition: "hardcut", transitionDuration: 0, editing: { rhythm: "balanced", syncToMusic: false }, audio: {} };
    const plan = createDeterministicPlan(project, [source]);
    const rendered = await renderPlan({ plan, sources: [source], outputDir: root, renderProfile: "preview" });
    const metadata = await probeMedia(rendered.outputPath, "video/mp4");
    assert.equal(metadata.hasVideo, true);
    assert.ok(metadata.duration >= 2.8 && metadata.duration <= 3.2);
    const quality = await inspectRenderedOutput(rendered.outputPath, rendered.plan);
    assert.equal(quality.passed, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
