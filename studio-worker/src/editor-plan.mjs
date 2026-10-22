import { STUDIO_EXPORT_FPS, STUDIO_EXPORT_QUALITIES, STUDIO_SCHEMA_VERSION, STUDIO_TEXT_ANIMATIONS, STUDIO_TRANSITIONS, validateEditPlan } from "../../shared/studio-contracts.mjs";
import { composePlanWaveform } from "./audio-waveform.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));
const allowedTransitions = new Set(Object.values(STUDIO_TRANSITIONS).map((item) => item.ffmpeg).filter((item) => item !== "auto"));
const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toUpperCase() : fallback;

export function prepareVisualEditorPlan(input, technicalPlan, analyzedSources) {
  if (!input || typeof input !== "object") throw new Error("O editor visual não enviou um plano válido.");
  const sources = new Map(analyzedSources.map((source) => [source.id, source]));
  const scenes = (Array.isArray(input.scenes) ? input.scenes : []).slice(0, 80).map((scene, index) => {
    const source = sources.get(String(scene.sourceId || ""));
    if (!source) throw new Error(`A origem da cena ${index + 1} não pertence a este projeto.`);
    const image = String(source.contentType || "").startsWith("image/");
    const duration = Math.max(0.5, Math.min(15, Number(scene.duration || 0)));
    const sourceDuration = Number(source.metadata?.duration || 0);
    const start = image ? 0 : Math.max(0, Math.min(Number(scene.start || 0), Math.max(0, sourceDuration - duration - 0.05)));
    const transition = index === 0 ? "none" : allowedTransitions.has(scene.transition) ? scene.transition : "fade";
    const transitionDuration = index === 0 || transition === "hardcut" ? 0 : Math.max(0.1, Math.min(1.5, Number(scene.transitionDuration || 0.35), duration / 2));
    return { ...scene, id: `scene-${index + 1}`, sourceId: source.id, sourceIndex: source.order, start: round(start), duration: round(duration), transition, transitionDuration: round(transitionDuration), selection: { ...(scene.selection || {}), method: "visual-editor-v1", reason: "Cena ajustada manualmente no editor visual." } };
  });
  if (!scenes.length) throw new Error("O plano editado precisa manter ao menos uma cena.");
  const duration = round(scenes.reduce((total, scene, index) => total + scene.duration - (index ? scene.transitionDuration : 0), 0));
  if (!(duration > 0 && duration <= 90)) throw new Error("A duração total editada deve ficar entre 1 e 90 segundos.");
  const textValues = input.text || {};
  const exportFps = STUDIO_EXPORT_FPS.includes(Number(input.export?.fps)) ? Number(input.export.fps) : Number(technicalPlan.export?.fps || 30);
  const exportQuality = STUDIO_EXPORT_QUALITIES[input.export?.quality] || STUDIO_EXPORT_QUALITIES[technicalPlan.export?.quality] || STUDIO_EXPORT_QUALITIES.balanced;
  const layerValues = new Map([['title', textValues.title], ['subtitle', textValues.subtitle], ['call_to_action', textValues.callToAction]]);
  const textLayers = (Array.isArray(input.textLayers) ? input.textLayers : technicalPlan.textLayers || []).slice(0, 20).map((layer, index) => ({
    id: String(layer.id || `text-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `text-${index + 1}`,
    type: ["title", "subtitle", "person", "description", "offer", "promotion", "closing", "call_to_action", "custom"].includes(layer.type) ? layer.type : "custom",
    value: String(layerValues.has(layer.type) ? layerValues.get(layer.type) : layer.value || "").replace(/\s+/g, " ").trim().slice(0, 180),
    start: Math.max(0, Math.min(duration, Number(layer.start || 0))),
    end: Math.max(0.1, Math.min(duration, Number(layer.end || duration))),
    animation: STUDIO_TEXT_ANIMATIONS.includes(layer.animation) ? layer.animation : "fade",
    position: ["top", "center", "bottom"].includes(layer.position) ? layer.position : "center",
    align: ["left", "center", "right"].includes(layer.align) ? layer.align : "center",
    font: ["sans", "serif", "mono"].includes(layer.font) ? layer.font : "sans",
    sizeScale: Math.max(0.7, Math.min(1.8, Number(layer.sizeScale || 1))),
    color: safeColor(layer.color, "#FFFFFF"), outlineColor: safeColor(layer.outlineColor, "#092B45"),
    background: layer.background !== false,
    margin: Math.max(24, Math.min(180, Number(layer.margin || 64))),
    slot: Math.max(0, Math.min(4, Number(layer.slot || 0)))
  })).filter((layer) => layer.value && layer.end > layer.start);
  const plan = {
    ...technicalPlan,
    ...input,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    duration,
    export: { fps: exportFps, quality: exportQuality.id, codec: "h264", audioCodec: "aac", videoBitrateKbps: exportQuality.videoBitrateKbps, audioBitrateKbps: exportQuality.audioBitrateKbps },
    planner: { type: "visual-editor", version: 1, semanticAnalysis: false, technicalSelection: true, basedOn: input.planner?.type || technicalPlan.planner?.type || "technical" },
    text: { title: String(textValues.title || "").slice(0, 120), subtitle: String(textValues.subtitle || "").slice(0, 180), callToAction: String(textValues.callToAction || "").slice(0, 100) },
    textLayers,
    audio: {
      ...(technicalPlan.audio || {}),
      musicVolume: Math.max(0, Math.min(0.7, Number(input.audio?.musicVolume ?? technicalPlan.audio?.musicVolume ?? 0.18))),
      voiceVolume: Math.max(0.5, Math.min(1.6, Number(input.audio?.voiceVolume ?? technicalPlan.audio?.voiceVolume ?? 1))),
      fadeSeconds: Math.max(0, Math.min(5, Number(input.audio?.fadeSeconds ?? technicalPlan.audio?.fadeSeconds ?? 1.2))),
      noiseReduction: input.audio?.noiseReduction === true,
      waveform: technicalPlan.audio?.waveform?.method === "music-pcm-envelope-v1" ? technicalPlan.audio.waveform : composePlanWaveform(scenes, analyzedSources, duration)
    },
    music: { ...(technicalPlan.music || {}), duckDuringSpeech: input.music?.duckDuringSpeech !== false },
    scenes
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano do editor visual inválido: ${validation.errors.join(" ")}`);
  return plan;
}
