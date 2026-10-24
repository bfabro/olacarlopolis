import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";
import { validateEditPlan } from "../../shared/studio-contracts.mjs";

const TRANSITIONS = ["fade", "dissolve", "zoomin", "zoomout", "slideleft", "wipeleft", "hblur", "smoothleft", "fadewhite", "circleopen", "hardcut", "fadeblack"];
const ROLES = ["opening", "development", "closing"];
const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

const sourceDisplayName = (source, fallback) => String(source?.name || source?.originalName || fallback || "mídia sem nome").replace(/[\r\n]+/g, " ").trim().slice(0, 120);

async function readableFrame(target) {
  const stats = await fs.stat(target);
  if (!stats.isFile() || stats.size < 128) throw Object.assign(new Error("O FFmpeg não gerou um quadro utilizável."), { code: "semantic_frame_missing" });
  return fs.readFile(target);
}

function frameArguments(source, candidate, target, fallback = false) {
  const filters = "scale=512:-2:force_original_aspect_ratio=decrease";
  if (String(source.contentType || "").startsWith("image/")) return ["-y", "-i", source.localPath, "-frames:v", "1", "-vf", filters, "-q:v", "4", target];
  const start = fallback ? 0 : Math.max(0, Number(candidate.start || 0));
  return ["-y", "-ss", String(start), "-i", source.localPath, "-frames:v", "1", "-vf", filters, "-q:v", "4", target];
}

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
  const warnings = [];
  const processRunner = options.runProcess || runProcess;
  const representative = new Map();
  candidates.forEach((candidate) => { if (!representative.has(candidate.sourceId)) representative.set(candidate.sourceId, candidate); });
  const selected = [...representative.values()].slice(0, options.maxFrames || workerConfig.aiMaxFrames);
  for (let frameIndex = 0; frameIndex < selected.length; frameIndex += 1) {
    const candidate = selected[frameIndex];
    const source = analyzedSources.find((item) => item.id === candidate.sourceId);
    if (!source) continue;
    const target = path.join(workDir, `semantic-frame-${frameIndex + 1}.jpg`);
    const displayName = sourceDisplayName(source, `mídia ${Number(source.order || 0) + 1}`);
    if (source.metadata?.hasVideo === false) {
      warnings.push({ code: "semantic_source_without_video", sourceId: source.id, sourceName: displayName, message: `“${displayName}” não possui imagem utilizável e foi ignorado somente na análise visual da IA.` });
      continue;
    }
    let frameBuffer = null;
    let lastError = null;
    try {
      const attempts = String(source.contentType || "").startsWith("image/") ? [false] : [false, true];
      for (const fallback of attempts) {
        await fs.rm(target, { force: true }).catch(() => {});
        try {
          await processRunner(workerConfig.ffmpegPath, frameArguments(source, candidate, target, fallback), { signal: options.signal });
          frameBuffer = await readableFrame(target);
          break;
        } catch (error) {
          if (error?.code === "studio_cancelled" || options.signal?.aborted) throw error;
          lastError = error;
        }
      }
      if (frameBuffer) frames.push({ candidateId: candidate.id, sourceId: source.id, dataUrl: `data:image/jpeg;base64,${frameBuffer.toString("base64")}` });
      else warnings.push({ code: "semantic_frame_unavailable", sourceId: source.id, sourceName: displayName, message: `Não foi possível preparar um quadro de “${displayName}”. A IA continuará com as demais mídias.` });
    } finally {
      await fs.rm(target, { force: true }).catch(() => {});
    }
    if (!frameBuffer && options.onWarning) await options.onWarning(warnings.at(-1), lastError);
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
  return { candidates, frames, transcripts, warnings };
}

const semanticSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    scenes: { type: "array", items: { type: "object", additionalProperties: false, properties: { candidateId: { type: "string" }, narrativeRole: { type: "string", enum: ROLES }, transition: { type: "string", enum: TRANSITIONS }, emphasis: { type: "string" }, onScreenText: { type: "string" }, containsPerson: { type: "boolean" }, narrationText: { type: "string" } }, required: ["candidateId", "narrativeRole", "transition", "emphasis", "onScreenText", "containsPerson", "narrationText"] } },
    narration: { type: "object", additionalProperties: false, properties: { script: { type: "string" }, tone: { type: "string", enum: ["professional", "warm", "energetic", "calm"] } }, required: ["script", "tone"] },
    textPreset: { type: "string", enum: ["clean", "cinematic", "promo", "local", "minimal", "impact"] },
    rhythm: { type: "string", enum: ["soft", "balanced", "dynamic"] },
    rationale: { type: "string" },
    confidence: { type: "number" }
  },
  required: ["scenes", "narration", "textPreset", "rhythm", "rationale", "confidence"]
};

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) for (const content of item?.content || []) if (typeof content?.text === "string") return content.text;
  return "";
}

function speechAt(source, start, duration = 0, transcript = null) {
  if (!source?.metadata?.hasAudio) return false;
  if (transcript && Array.isArray(transcript.segments)) {
    const end = start + Math.max(0.1, Number(duration || 0));
    return transcript.segments.some((segment) => Number(segment.end || 0) > start && Number(segment.start || 0) < end);
  }
  return !(source.technical?.silences || []).some((silence) => start >= silence.start && start < silence.end);
}

export function mergeSemanticDirection(basePlan, direction, evidence, analyzedSources, providerMeta = {}) {
  const byCandidate = new Map(evidence.candidates.map((candidate) => [candidate.id, candidate]));
  const requested = (direction.scenes || []).map((item) => ({ item, candidate: byCandidate.get(item.candidateId) })).filter((entry) => entry.candidate);
  if (!requested.length) throw new Error("O diretor de IA não retornou candidatos válidos.");
  const scenes = basePlan.scenes.map((baseScene, index) => {
    const directed = requested[index % requested.length];
    const source = analyzedSources.find((item) => item.id === directed.candidate.sourceId);
    const sourceTranscript = evidence.transcripts.find((item) => item.sourceId === directed.candidate.sourceId) || null;
    const userTransitionLocked = basePlan.transition.mode !== "auto";
    const sourceDuration = Number(source?.metadata?.duration || 0);
    const safeStart = directed.candidate.kind === "image"
      ? 0
      : Math.max(0, Math.min(directed.candidate.start, Math.max(0, sourceDuration - Number(baseScene.duration || 0) - 0.05)));
    const hasSpeech = speechAt(source, safeStart, baseScene.duration, sourceTranscript);
    return {
      ...baseScene,
      sourceId: directed.candidate.sourceId,
      sourceIndex: directed.candidate.sourceIndex,
      start: safeStart,
      transition: index === 0 ? "none" : userTransitionLocked ? baseScene.transition : directed.item.transition,
      hasSpeech,
      containsPerson: directed.item.containsPerson === true,
      narrativeRole: directed.item.narrativeRole,
      onScreenText: hasSpeech ? "" : String(directed.item.onScreenText || "").replace(/\s+/g, " ").trim().slice(0, 90),
      narrationText: hasSpeech || directed.item.containsPerson === true ? "" : String(directed.item.narrationText || "").replace(/\s+/g, " ").trim().slice(0, 320),
      selection: { method: "semantic-ai-v1", candidateId: directed.candidate.id, qualityScore: directed.candidate.qualityScore, flags: directed.candidate.flags, reason: String(directed.item.emphasis || "").slice(0, 280) }
    };
  });
  let timeline = 0;
  const aiTextLayers = scenes.map((scene, index) => {
    const start = timeline;
    const end = Math.min(Number(basePlan.duration || 0), start + Number(scene.duration || 0));
    timeline = Math.max(0, end - Number(scene.transitionDuration || 0));
    if (!scene.onScreenText || scene.hasSpeech === true) return null;
    return { id: `ai-scene-text-${index + 1}`, type: "ai_scene_text", value: scene.onScreenText, start, end, animation: "fade", position: basePlan.narration?.enabled ? "top" : "bottom", slot: basePlan.narration?.enabled ? 1 : 0, sizeScale: 0.82, color: "#FFFFFF", outlineColor: "#092B45", background: true, align: "center", font: "sans", margin: 86 };
  }).filter(Boolean);
  const directedScript = scenes.map((scene) => scene.narrationText).filter(Boolean).join(" ");
  const script = String(directedScript || direction.narration?.script || "").replace(/\s+/g, " ").trim().slice(0, 4000);
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
    scenes,
    textLayers: [...(basePlan.textLayers || []), ...aiTextLayers],
    narration: { ...basePlan.narration, generated: true, script, tone: direction.narration?.tone || basePlan.narration?.tone || "professional", disclosure: "Voz gerada por inteligência artificial." }
  };
  return validateSemanticPlan(plan);
}

export function markSemanticFallback(basePlan, reason, details = {}) {
  const safeReason = String(reason || "Diretor de IA indisponível.").slice(0, 300);
  return { ...basePlan, planner: { ...basePlan.planner, aiRequested: true, fallback: true, fallbackReason: safeReason, fallbackCode: String(details.code || "semantic_unavailable").slice(0, 80) }, aiDirector: { requested: true, applied: false, reason: safeReason, code: String(details.code || "semantic_unavailable").slice(0, 80) } };
}

export function semanticFailureInfo(error) {
  const status = Number(error?.status || 0);
  const rawCode = String(error?.apiCode || error?.code || "semantic_unavailable").toLowerCase();
  if (status === 401 || rawCode.includes("api_key") || rawCode.includes("authentication")) return { code: "openai_authentication", message: "A chave da IA foi recusada. Verifique se ela está ativa e pertence ao projeto correto." };
  if (status === 403 || rawCode.includes("permission")) return { code: "openai_permission", message: "A chave não possui permissão para usar o Diretor de IA." };
  if (status === 429 || rawCode.includes("rate_limit")) return { code: "openai_limit", message: "A conta da IA atingiu um limite de uso, saldo ou velocidade. A montagem local continuará normalmente." };
  if (rawCode.includes("timeout") || error?.name === "TimeoutError") return { code: "openai_timeout", message: "A IA demorou além do limite para responder. A montagem local continuará normalmente." };
  if (rawCode.includes("invalid_json") || error instanceof SyntaxError) return { code: "openai_invalid_response", message: "A IA respondeu em um formato que não pôde ser validado. A montagem local continuará normalmente." };
  if (rawCode.includes("invalid_plan")) return { code: "openai_invalid_plan", message: "O plano sugerido pela IA não passou nas validações de segurança da edição." };
  return { code: rawCode.replace(/[^a-z0-9_-]/g, "_").slice(0, 80) || "semantic_unavailable", message: "A direção por IA não pôde ser concluída. A montagem técnica local continuará normalmente." };
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
    const minWords = Math.max(12, Math.floor(Number(basePlan.duration || 30) * 1.55));
    const maxWords = Math.max(minWords + 6, Math.floor(Number(basePlan.duration || 30) * 1.95));
    const wantsScript = project.narration?.generateScript === true;
    const compactEvidence = { candidates: evidence.candidates, transcripts: evidence.transcripts, baseScenes: basePlan.scenes.map((scene) => ({ sourceId: scene.sourceId, start: scene.start, duration: scene.duration, narrativeRole: scene.narrativeRole })) };
    const content = [
      { type: "input_text", text: `Você é o diretor de edição do Olá Studio. Responda somente no JSON solicitado. Não invente fatos, pessoas, preços, locais ou características. Use somente informações visíveis nos quadros, presentes nas transcrições ou declaradas no objetivo do usuário. Use apenas candidateId existentes. Preserve a duração e a segurança técnica do plano-base. Para cada cena, marque containsPerson=true quando houver uma pessoa visível. Quando houver fala humana na origem, deixe onScreenText e narrationText vazios: a fala real receberá sua própria legenda sincronizada. ${wantsScript ? `Somente em cenas sem fala e sem pessoa visível, escreva narrationText curto, factual e apropriado ao local ou objeto mostrado; ele será narrado e legendado. O campo narration.script deve reunir, na mesma ordem, somente esses narrationText, sem acrescentar descrições. onScreenText pode ser usado somente quando não competir com a fala. Mantenha o roteiro total conciso, com no máximo ${maxWords} palavras.` : "Retorne todos os onScreenText, narrationText e narration.script vazios."} Objetivo do usuário: ${brief}\nContexto técnico: ${JSON.stringify(compactEvidence)}` }
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
    if (!response.ok) throw Object.assign(new Error(`Diretor de IA respondeu HTTP ${response.status}: ${String(payload?.error?.message || "erro não detalhado").slice(0, 240)}`), { status: response.status, code: "openai_api_error", apiCode: payload?.error?.code || payload?.error?.type || "" });
    const text = responseText(payload);
    if (!text) throw Object.assign(new Error("Diretor de IA não devolveu um plano estruturado."), { code: "openai_empty_response" });
    let direction;
    try { direction = JSON.parse(text); }
    catch (error) { throw Object.assign(new Error("Diretor de IA devolveu um JSON inválido."), { code: "openai_invalid_json", cause: error }); }
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
  if (!validation.valid) throw Object.assign(new Error(`Plano semantico invalido: ${validation.errors.join(" ")}`), { code: "semantic_invalid_plan" });
  if (plan.planner?.type !== "semantic-ai" || plan.planner?.semanticAnalysis !== true) throw Object.assign(new Error("O plano de IA deve declarar análise semântica real."), { code: "semantic_invalid_plan" });
  return plan;
}
