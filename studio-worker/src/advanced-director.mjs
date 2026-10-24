import { workerConfig } from "./config.mjs";
import { estimateSemanticUsageCost } from "./ai-planner.mjs";
import { validateEditPlan } from "../../shared/studio-contracts.mjs";

const TRANSITIONS = ["fade", "dissolve", "zoomin", "zoomout", "slideleft", "wipeleft", "hblur", "smoothleft", "fadewhite", "circleopen", "hardcut", "fadeblack"];
const PHOTO_MOTIONS = ["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down"];
const ROLES = ["opening", "development", "closing"];
const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

const advancedSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    objective: { type: "string" }, identifiedTheme: { type: "string" }, narrativeProposal: { type: "string" },
    scenes: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      candidateId: { type: "string" }, narrativeRole: { type: "string", enum: ROLES }, transition: { type: "string", enum: TRANSITIONS },
      selectionReason: { type: "string" }, continuityIntent: { type: "string" }, narrativeRelevance: { type: "number" }, intentionalException: { type: "string", enum: ["none", "contrast", "flashback", "parallel"] }, containsPerson: { type: "boolean" },
      onScreenText: { type: "string" }, narrationText: { type: "string" }, highlightType: { type: "string", enum: ["none", "title", "keyword", "cta"] },
      textPosition: { type: "string", enum: ["top", "bottom"] }, textAnimation: { type: "string", enum: ["fade", "slide_up", "zoom_pop", "reveal"] }, highlightDuration: { type: "number" },
      photoMotion: { type: "string", enum: PHOTO_MOTIONS }, focusX: { type: "number" }, focusY: { type: "number" }
    }, required: ["candidateId", "narrativeRole", "transition", "selectionReason", "continuityIntent", "narrativeRelevance", "intentionalException", "containsPerson", "onScreenText", "narrationText", "highlightType", "textPosition", "textAnimation", "highlightDuration", "photoMotion", "focusX", "focusY"] } },
    narration: { type: "object", additionalProperties: false, properties: { script: { type: "string" }, tone: { type: "string", enum: ["professional", "warm", "energetic", "calm"] } }, required: ["script", "tone"] },
    rhythm: { type: "object", additionalProperties: false, properties: { pace: { type: "string", enum: ["soft", "balanced", "dynamic"] }, musicDirection: { type: "string" } }, required: ["pace", "musicDirection"] },
    closingProposal: { type: "string" }, rationale: { type: "string" }, confidence: { type: "number" }
  },
  required: ["objective", "identifiedTheme", "narrativeProposal", "scenes", "narration", "rhythm", "closingProposal", "rationale", "confidence"]
};

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) for (const content of item?.content || []) if (typeof content?.text === "string") return content.text;
  return "";
}

function hasSpeech(source, candidate, transcript) {
  if (!source?.metadata?.hasAudio) return false;
  if (transcript?.segments?.length) return transcript.segments.some((segment) => Number(segment.end || 0) > candidate.start && Number(segment.start || 0) < candidate.start + 3);
  return !(source.technical?.silences || []).some((silence) => candidate.start >= silence.start && candidate.start < silence.end);
}

export function summarizeTemporalEvidence(evidence, analyzedSources) {
  const sourceCounts = new Map();
  evidence.candidates.forEach((candidate) => sourceCounts.set(candidate.sourceId, (sourceCounts.get(candidate.sourceId) || 0) + 1));
  return {
    sourceCount: analyzedSources.length,
    candidateCount: evidence.candidates.length,
    frameCount: evidence.frames.length,
    transcriptCount: evidence.transcripts.length,
    coverage: analyzedSources.map((source) => ({ sourceId: source.id, candidates: sourceCounts.get(source.id) || 0, duration: Number(source.metadata?.duration || 0), orientation: source.metadata?.orientation || "unknown", cameraMotion: source.technical?.cameraMotion || null })),
    method: "multi-frame-temporal-evidence-v1"
  };
}

export function mergeAdvancedDirection(basePlan, direction, evidence, analyzedSources, providerMeta = {}) {
  const candidates = new Map(evidence.candidates.map((candidate) => [candidate.id, candidate]));
  const requested = (direction.scenes || []).map((item) => ({ item, candidate: candidates.get(item.candidateId) })).filter((entry) => entry.candidate);
  if (!requested.length) throw Object.assign(new Error("O Diretor Avançado não retornou cenas válidas."), { code: "advanced_invalid_plan" });
  const seen = new Set();
  const scenes = basePlan.scenes.map((baseScene, index) => {
    const directed = requested[index % requested.length];
    const candidate = directed.candidate;
    const source = analyzedSources.find((item) => item.id === candidate.sourceId);
    if (!source) throw Object.assign(new Error("O Diretor Avançado referenciou uma origem inexistente."), { code: "advanced_invalid_source" });
    const sourceDuration = Number(source.metadata?.duration || 0);
    const safeStart = candidate.kind === "image" ? 0 : Math.max(0, Math.min(candidate.start, Math.max(0, sourceDuration - Number(baseScene.duration || 0) - 0.05)));
    const transcript = evidence.transcripts.find((item) => item.sourceId === candidate.sourceId);
    const speech = hasSpeech(source, candidate, transcript);
    const duplicateKey = `${candidate.sourceId}:${safeStart.toFixed(2)}`;
    const duplicate = seen.has(duplicateKey);
    seen.add(duplicateKey);
    return {
      ...baseScene, sourceId: candidate.sourceId, sourceIndex: candidate.sourceIndex, start: safeStart, sourceEnd: candidate.kind === "image" ? 0 : round(safeStart + Number(baseScene.duration || 0)),
      transition: index === 0 ? "none" : basePlan.transition.mode !== "auto" ? baseScene.transition : directed.item.transition,
      hasSpeech: speech, containsPerson: directed.item.containsPerson === true, narrativeRole: directed.item.narrativeRole,
      onScreenText: speech || directed.item.containsPerson === true ? "" : String(directed.item.onScreenText || "").replace(/\s+/g, " ").trim().slice(0, 72),
      narrationText: speech || directed.item.containsPerson === true ? "" : String(directed.item.narrationText || "").replace(/\s+/g, " ").trim().slice(0, 280),
      photoMotion: candidate.kind === "image" ? { type: directed.item.photoMotion, focusX: Math.max(0.1, Math.min(0.9, Number(directed.item.focusX || 0.5))), focusY: Math.max(0.1, Math.min(0.9, Number(directed.item.focusY || 0.5))), easing: "smooth", scale: 1.12 } : null,
      selection: { method: "advanced-semantic-ai-v1", candidateId: candidate.id, qualityScore: candidate.qualityScore, narrativeRelevance: round(Math.max(0, Math.min(1, Number(directed.item.narrativeRelevance || 0)))), flags: candidate.flags, temporalPhase: candidate.temporalPhase, continuityIntent: String(directed.item.continuityIntent || "").slice(0, 240), intentionalException: directed.item.intentionalException || "none", reason: String(directed.item.selectionReason || "").slice(0, 280), duplicateWarning: duplicate }
    };
  });
  let timeline = 0;
  const highlights = [];
  scenes.forEach((scene, index) => {
    const start = timeline;
    const end = Math.min(Number(basePlan.duration || 0), start + Number(scene.duration || 0));
    timeline = Math.max(0, end - Number(scene.transitionDuration || 0));
    const requestedScene = requested[index % requested.length]?.item;
    if (!scene.onScreenText || scene.hasSpeech || scene.containsPerson || requestedScene?.highlightType === "none") return;
    highlights.push({ id: `advanced-highlight-${index + 1}`, type: "custom", value: scene.onScreenText, start, end: Math.min(end, start + Math.max(1.2, Math.min(4.5, Number(requestedScene?.highlightDuration || 3)))), animation: requestedScene?.textAnimation || "fade", position: requestedScene?.textPosition || "top", slot: 0, sizeScale: requestedScene?.highlightType === "title" ? 1 : 0.82, color: "#FFFFFF", outlineColor: "#092B45", background: true, align: "center", font: "sans", margin: 92 });
  });
  const script = scenes.map((scene) => scene.narrationText).filter(Boolean).join(" ").slice(0, 4000);
  const plan = {
    ...basePlan,
    planner: { type: "advanced-semantic-ai", version: 1, semanticAnalysis: true, temporalAnalysis: true, technicalSelection: true, provider: providerMeta.provider || "openai", model: providerMeta.model || "configured", fallback: false },
    aiDirector: { requested: true, applied: true, advanced: true, objective: String(direction.objective || "").slice(0, 500), identifiedTheme: String(direction.identifiedTheme || "").slice(0, 300), narrativeProposal: String(direction.narrativeProposal || "").slice(0, 1000), closingProposal: String(direction.closingProposal || "").slice(0, 500), rationale: String(direction.rationale || "").slice(0, 1200), confidence: round(Math.max(0, Math.min(1, Number(direction.confidence || 0)))), musicDirection: String(direction.rhythm?.musicDirection || "").slice(0, 500), evidenceSummary: summarizeTemporalEvidence(evidence, analyzedSources), usage: providerMeta.usage || null, estimatedCostUsd: Number(providerMeta.estimatedCostUsd || 0) },
    scenes,
    textLayers: [...(basePlan.textLayers || []), ...highlights],
    narration: { ...basePlan.narration, generated: true, script, tone: direction.narration?.tone || basePlan.narration?.tone || "professional", disclosure: "Voz gerada por inteligência artificial." }
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw Object.assign(new Error(`Plano avançado inválido: ${validation.errors.join(" ")}`), { code: "advanced_invalid_plan" });
  return plan;
}

export class OpenAIAdvancedDirector {
  constructor(options = {}) {
    this.apiKey = options.apiKey || "";
    this.model = options.model || "";
    this.fetchImpl = options.fetchImpl || fetch;
    this.endpoint = options.endpoint || "https://api.openai.com/v1/responses";
  }
  get enabled() { return Boolean(workerConfig.advancedDirectorEnabled && this.apiKey && this.model); }
  async createPlan({ project, basePlan, evidence, analyzedSources, signal }) {
    if (!this.enabled) throw Object.assign(new Error("Diretor Avançado desativado neste worker."), { code: "advanced_feature_disabled" });
    const wantsScript = project.narration?.generateScript === true;
    const compact = { objective: String(project.director?.brief || "Montagem profissional e coerente.").slice(0, 1200), duration: basePlan.duration, format: basePlan.format, style: basePlan.style, rhythm: basePlan.rhythm, candidates: evidence.candidates, transcripts: evidence.transcripts };
    const content = [{ type: "input_text", text: `Atue como diretor audiovisual do Olá Studio. Analise o conjunto inteiro antes de escolher a ordem. Responda somente no JSON exigido. Use exclusivamente candidateId fornecidos e fatos visíveis, transcritos ou informados pelo usuário. Compare começo, meio e fim de cada origem; evite redundância; mantenha continuidade espacial, temática, de ação e de fala. Não interrompa uma fala coerente. Prefira qualidade técnica sem sacrificar a narrativa. Use intentionalException somente quando contraste, flashback ou montagem paralela forem deliberados e justificáveis. Marque containsPerson quando houver pessoa visível. Nessas cenas, ou quando houver fala humana, deixe onScreenText e narrationText vazios. Destaques devem ser curtos e ficar em área segura, sem simular botões. Para fotos, escolha movimento sutil e foco normalizado entre 0.1 e 0.9. ${wantsScript ? "Nas cenas sem fala e sem pessoa, produza narração factual curta e correspondente ao quadro." : "Deixe toda narração e textos de cena vazios."} Contexto: ${JSON.stringify(compact)}` }];
    evidence.frames.forEach((frame) => { content.push({ type: "input_text", text: `Quadro temporal ${frame.temporalPhase}, ${frame.candidateId}, origem ${frame.sourceId}, tempo ${frame.time}s:` }); content.push({ type: "input_image", image_url: frame.dataUrl, detail: workerConfig.aiImageDetail }); });
    const timeoutSignal = AbortSignal.timeout(workerConfig.aiTimeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    const response = await this.fetchImpl(this.endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify({ model: this.model, store: false, input: [{ role: "user", content }], text: { format: { type: "json_schema", name: "ola_studio_advanced_direction", strict: true, schema: advancedSchema } } }), signal: requestSignal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(`Diretor Avançado respondeu HTTP ${response.status}: ${String(payload?.error?.message || "erro não detalhado").slice(0, 240)}`), { status: response.status, code: payload?.error?.code || "advanced_api_error" });
    let direction;
    try { direction = JSON.parse(responseText(payload)); } catch (error) { throw Object.assign(new Error("O Diretor Avançado devolveu uma resposta inválida."), { code: "advanced_invalid_json", cause: error }); }
    return mergeAdvancedDirection(basePlan, direction, evidence, analyzedSources, { provider: "openai", model: this.model, usage: payload.usage || null, estimatedCostUsd: estimateSemanticUsageCost(payload.usage, { inputUsdPerMillion: workerConfig.aiInputUsdPerMillion, outputUsdPerMillion: workerConfig.aiOutputUsdPerMillion }) });
  }
}

export function createAdvancedDirector(options = {}) {
  return new OpenAIAdvancedDirector({ apiKey: options.apiKey ?? workerConfig.openaiApiKey, model: options.model ?? workerConfig.openaiModel, fetchImpl: options.fetchImpl });
}
