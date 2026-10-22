import { STUDIO_SCHEMA_VERSION, STUDIO_TRANSITIONS, validateEditPlan } from "../../shared/studio-contracts.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));
const allowedTransitions = new Set(Object.values(STUDIO_TRANSITIONS).map((item) => item.ffmpeg).filter((item) => item !== "auto"));

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
  const layerValues = new Map([['title', textValues.title], ['subtitle', textValues.subtitle], ['call_to_action', textValues.callToAction]]);
  const textLayers = (Array.isArray(input.textLayers) ? input.textLayers : technicalPlan.textLayers || []).slice(0, 20).map((layer) => ({
    ...layer,
    value: String(layerValues.has(layer.type) ? layerValues.get(layer.type) : layer.value || "").trim().slice(0, 180),
    start: Math.max(0, Math.min(duration, Number(layer.start || 0))),
    end: Math.max(0.1, Math.min(duration, Number(layer.end || duration)))
  })).filter((layer) => layer.value && layer.end > layer.start);
  const plan = {
    ...technicalPlan,
    ...input,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    duration,
    planner: { type: "visual-editor", version: 1, semanticAnalysis: false, technicalSelection: true, basedOn: input.planner?.type || technicalPlan.planner?.type || "technical" },
    text: { title: String(textValues.title || "").slice(0, 120), subtitle: String(textValues.subtitle || "").slice(0, 180), callToAction: String(textValues.callToAction || "").slice(0, 100) },
    textLayers,
    scenes
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano do editor visual inválido: ${validation.errors.join(" ")}`);
  return plan;
}
