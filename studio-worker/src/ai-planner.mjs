import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";
import { validateEditPlan } from "../../shared/studio-contracts.mjs";

const TRANSITIONS = ["fade", "dissolve", "zoomin", "zoomout", "slideleft", "wipeleft", "hblur", "smoothleft", "fadewhite", "circleopen", "hardcut", "fadeblack"];
const ROLES = ["opening", "development", "closing"];
const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

export function buildSemanticCandidates(analyzedSources, maxCandidates = 24) {
  const candidates = [];
  for (const source of analyzedSources) {
    const isImage = String(source.contentType || "").startsWith("image/");
    const windows = isImage
      ? [{ start: 0, score: source.technical?.qualityWindows?.[0]?.score || 0.8, flags: [] }]
      : [...(source.technical?.qualityWindows || [])].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 3);
    for (const window of windows.length ? windows : [{ start: 0, score: 0.6, flags: [] }]) {
      const start = isImage ? 0 : Math.max(0, Math.min(Number(window.start || 0), Math.max(0, Number(source.metadata?.duration || 0) - 0.5)));
      candidates.push({
        id: `candidate-${candidates.length + 1}`,
        sourceId: source.id,
        sourceIndex: source.order,
        start: round(start),
        qualityScore: round(window.score || 0.6),
        flags: [...new Set(window.flags || [])],
        orientation: source.metadata?.orientation || "unknown",
        hasAudio: source.metadata?.hasAudio === true,
        kind: isImage ? "image" : "video"
      });
    }
  }
  return candidates.sort((a, b) => b.qualityScore - a.qualityScore || a.sourceIndex - b.sourceIndex).slice(0, maxCandidates).map((item, index) => ({ ...item, id: `candidate-${index + 1}` }));
}

export async function prepareSemanticEvidence(analyzedSources, workDir, options = {}) {
  const candidates = buildSemanticCandidates(analyzedSources);
  const frames = [];
  const transcripts = [];
  const representative = new Map();
  candidates.forEach((candidate) => { if (!representative.has(candidate.sourceId)) representative.set(candidate.sourceId, candidate); });
  for (const candidate of [...representative.values()].slice(0, options.maxFrames || workerConfig.aiMaxFrames)) {
    const source = analyzedSources.find((item) => item.id === candidate.sourceId);
    if (!source) continue;
    const target = path.join(workDir, `semantic-frame-${frames.length + 1}.jpg`);
    try {
      await runProcess(workerConfig.ffmpegPath, ["-y", "-ss", String(candidate.start), "-i", source.localPath, "-frames:v", "1", "-vf", "scale=512:-2:force_original_aspect_ratio=decrease", "-q:v", "4", target], { signal: options.signal });
      frames.push({ candidateId: candidate.id, sourceId: source.id, dataUrl: `data:image/jpeg;base64,${(await fs.readFile(target)).toString("base64")}` });
    } finally {
      await fs.rm(target, { force: true }).catch(() => {});
    }
  }
  if (options.transcriptionProvider?.enabled) {
    let transcribedSeconds = 0;
    for (const source of analyzedSources.filter((item) => item.metadata?.hasAudio)) {
      const duration = Number(source.metadata?.duration || 0);
      if (transcribedSeconds + duration > 180) break;
      const result = await options.transcriptionProvider.transcribeFile(source.localPath, workDir, { signal: options.signal, prompt: options.prompt || "" }).catch((error) => ({ available: false, reason: error.message }));
      if (result.available) transcripts.push({ sourceId: source.id, text: result.segments.map((segment) => segment.text).join(" ").slice(0, 4000), segments: result.segments.slice(0, 80).map((segment) => ({ start: segment.start, end: segment.end, text: segment.text })) });
      transcribedSeconds += duration;
    }
  }
  return { candidates, frames, transcripts };
}

const semanticSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    scenes: { type: "array", items: { type: "object", additionalProperties: false, properties: { candidateId: { type: "string" }, narrativeRole: { type: "string", enum: ROLES }, transition: { type: "string", enum: TRANSITIONS }, emphasis: { type: "string" } }, required: ["candidateId", "narrativeRole", "transition", "emphasis"] } },
    textPreset: { type: "string", enum: ["clean", "cinematic", "promo", "local", "minimal", "impact"] },
    rhythm: { type: "string", enum: ["soft", "balanced", "dynamic"] },
    rationale: { type: "string" },
    confidence: { type: "number" }
  },
  required: ["scenes", "textPreset", "rhythm", "rationale", "confidence"]
};

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) for (const content of item?.content || []) if (typeof content?.text === "string") return content.text;
  return "";
}

function speechAt(source, start) {
  if (!source?.metadata?.hasAudio) return false;
  return !(source.technical?.silences || []).some((silence) => start >= silence.start && start < silence.end);
}

export function mergeSemanticDirection(basePlan, direction, evidence, analyzedSources, providerMeta = {}) {
  const byCandidate = new Map(evidence.candidates.map((candidate) => [candidate.id, candidate]));
  const requested = (direction.scenes || []).map((item) => ({ item, candidate: byCandidate.get(item.candidateId) })).filter((entry) => entry.candidate);
  if (!requested.length) throw new Error("O diretor de IA não retornou candidatos válidos.");
  const scenes = basePlan.scenes.map((baseScene, index) => {
    const directed = requested[index % requested.length];
    const source = analyzedSources.find((item) => item.id === directed.candidate.sourceId);
    const userTransitionLocked = basePlan.transition.mode !== "auto";
    const sourceDuration = Number(source?.metadata?.duration || 0);
    const safeStart = directed.candidate.kind === "image"
      ? 0
      : Math.max(0, Math.min(directed.candidate.start, Math.max(0, sourceDuration - Number(baseScene.duration || 0) - 0.05)));
    return {
      ...baseScene,
      sourceId: directed.candidate.sourceId,
      sourceIndex: directed.candidate.sourceIndex,
      start: safeStart,
      transition: index === 0 ? "none" : userTransitionLocked ? baseScene.transition : directed.item.transition,
      hasSpeech: speechAt(source, safeStart),
      narrativeRole: directed.item.narrativeRole,
      selection: { method: "semantic-ai-v1", candidateId: directed.candidate.id, qualityScore: directed.candidate.qualityScore, flags: directed.candidate.flags, reason: String(directed.item.emphasis || "").slice(0, 280) }
    };
  });
  const plan = {
    ...basePlan,
    planner: { type: "semantic-ai", version: 1, semanticAnalysis: true, technicalSelection: true, provider: providerMeta.provider || "openai", model: providerMeta.model || "configured", fallback: false },
    aiDirector: {
      requested: true,
      applied: true,
      rationale: String(direction.rationale || "").slice(0, 1200),
      confidence: round(Math.max(0, Math.min(1, Number(direction.confidence || 0)))),
      recommendedTextPreset: direction.textPreset,
      recommendedRhythm: direction.rhythm,
      visualInputCount: evidence.frames.length,
      transcriptionInputCount: evidence.transcripts.length,
      usage: providerMeta.usage || null,
      estimatedCostUsd: Number(providerMeta.estimatedCostUsd || 0)
    },
    scenes
  };
  return validateSemanticPlan(plan);
}

export function markSemanticFallback(basePlan, reason) {
  return { ...basePlan, planner: { ...basePlan.planner, aiRequested: true, fallback: true, fallbackReason: String(reason || "Diretor de IA indisponível.").slice(0, 300) }, aiDirector: { requested: true, applied: false, reason: String(reason || "Diretor de IA indisponível.").slice(0, 300) } };
}

export class OpenAISemanticPlanner {
  constructor(options = {}) {
    this.apiKey = options.apiKey || "";
    this.model = options.model || "";
    this.fetchImpl = options.fetchImpl || fetch;
    this.endpoint = options.endpoint || "https://api.openai.com/v1/responses";
    this.pricing = options.pricing || { inputUsdPerMillion: workerConfig.aiInputUsdPerMillion, outputUsdPerMillion: workerConfig.aiOutputUsdPerMillion };
  }
  get enabled() { return Boolean(this.apiKey && this.model); }
  async createPlan({ project, basePlan, evidence, analyzedSources, signal }) {
    if (!this.enabled) throw new Error("Diretor de IA não configurado no worker.");
    const brief = String(project.director?.brief || "Criar uma montagem profissional coerente com o modelo selecionado.").slice(0, 1200);
    const compactEvidence = { candidates: evidence.candidates, transcripts: evidence.transcripts, baseScenes: basePlan.scenes.map((scene) => ({ sourceId: scene.sourceId, start: scene.start, duration: scene.duration, narrativeRole: scene.narrativeRole })) };
    const content = [
      { type: "input_text", text: `Você é o diretor de edição do Olá Studio. Responda somente no JSON solicitado. Não invente fatos, pessoas, preços ou características. Use apenas candidateId existentes. Preserve a duração e a segurança técnica do plano-base. Objetivo do usuário: ${brief}\nContexto técnico: ${JSON.stringify(compactEvidence)}` }
    ];
    evidence.frames.forEach((frame) => { content.push({ type: "input_text", text: `Quadro representativo do ${frame.candidateId}, origem ${frame.sourceId}:` }); content.push({ type: "input_image", image_url: frame.dataUrl, detail: workerConfig.aiImageDetail }); });
    const timeoutSignal = AbortSignal.timeout(workerConfig.aiTimeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, store: false, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "ola_studio_direction", strict: true, schema: semanticSchema } } }),
      signal: requestSignal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Diretor de IA respondeu HTTP ${response.status}: ${String(payload?.error?.message || "erro não detalhado").slice(0, 240)}`);
    const text = responseText(payload);
    if (!text) throw new Error("Diretor de IA não devolveu um plano estruturado.");
    const direction = JSON.parse(text);
    return mergeSemanticDirection(basePlan, direction, evidence, analyzedSources, { provider: "openai", model: this.model, usage: payload.usage || null, estimatedCostUsd: estimateSemanticUsageCost(payload.usage, this.pricing) });
  }
}

export function estimateSemanticUsageCost(usage = {}, pricing = {}) {
  if (!usage || typeof usage !== "object") return null;
  const inputTokens = Number(usage.input_tokens || usage.prompt_tokens || 0);
  const outputTokens = Number(usage.output_tokens || usage.completion_tokens || 0);
  const inputRate = Math.max(0, Number(pricing.inputUsdPerMillion || 0));
  const outputRate = Math.max(0, Number(pricing.outputUsdPerMillion || 0));
  return Number(((inputTokens * inputRate + outputTokens * outputRate) / 1_000_000).toFixed(6));
}

export function createSemanticPlanner(options = {}) {
  return new OpenAISemanticPlanner({ apiKey: options.apiKey ?? workerConfig.openaiApiKey, model: options.model ?? workerConfig.openaiModel, fetchImpl: options.fetchImpl });
}

export function validateSemanticPlan(plan) {
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano semantico invalido: ${validation.errors.join(" ")}`);
  if (plan.planner?.type !== "semantic-ai" || plan.planner?.semanticAnalysis !== true) throw new Error("O plano de IA deve declarar análise semântica real.");
  return plan;
}
