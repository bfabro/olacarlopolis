import { STUDIO_SCHEMA_VERSION, studioStyleParameters, studioTransitionParameters, validateEditPlan } from "../../shared/studio-contracts.mjs";

const AUTO_TRANSITIONS = Object.freeze({
  institucional: ["fade", "dissolve", "fadeblack"],
  comercial: ["fadeblack", "fadewhite", "dissolve"],
  reels: ["smoothleft", "fadewhite", "hardcut", "slideleft"],
  comercio_local: ["dissolve", "slideleft", "fade"],
  imoveis: ["smoothleft", "dissolve", "fade"],
  gastronomia: ["zoomin", "dissolve", "fadewhite"],
  eventos: ["fadewhite", "smoothleft", "hardcut"],
  turismo: ["fade", "dissolve", "fadeblack"]
});

function textLayersFor(project, duration) {
  const design = project.textDesign || {};
  const layers = [];
  const add = (type, value, start, end, options = {}) => {
    if (!value) return;
    layers.push({ id: `text-${layers.length + 1}`, type, value, start: Math.max(0, start), end: Math.min(duration, Math.max(start + 0.5, end)), animation: options.animation || design.animation || "fade", position: options.position || design.position || "top", slot: options.slot || 0, sizeScale: Number(design.sizeScale || 1) * Number(options.scale || 1), color: design.color || "#FFFFFF", outlineColor: design.outlineColor || "#092B45", background: design.background !== false, align: design.align || "center", font: design.font || "sans", margin: Number(design.margin || 64) });
  };
  add("title", project.title, 0.25, Math.min(5.2, duration * 0.34), { scale: 1.35, position: "top" });
  add("subtitle", project.subtitle, 0.8, Math.min(6, duration * 0.4), { scale: 0.82, position: "top", slot: 1 });
  add("person", [project.personName, project.personRole].filter(Boolean).join(" — "), duration * 0.24, duration * 0.4, { scale: 0.82, position: "bottom" });
  add("description", project.sceneDescription, duration * 0.38, duration * 0.56, { scale: 0.78, position: "bottom" });
  add("offer", project.offerText, duration * 0.5, duration * 0.67, { scale: 1.25, position: "center", animation: "zoom_pop" });
  add("promotion", project.promoText, duration * 0.64, duration * 0.8, { scale: 0.92, position: "center" });
  add("closing", project.closingText, Math.max(0, duration - 6), Math.max(0.6, duration - 1), { scale: 1.05, position: "center" });
  add("call_to_action", project.callToAction, Math.max(0, duration - 4.5), duration - 0.15, { scale: 0.95, position: "bottom", slot: 1 });
  return layers;
}

function candidateStarts(source, clipDuration) {
  if (source.contentType.startsWith("image/")) return [0];
  const maxStart = Math.max(0, source.metadata.duration - clipDuration);
  const sceneStarts = source.technical.sceneTimes.length ? source.technical.sceneTimes : [0];
  return sceneStarts.map((time) => Math.min(maxStart, Math.max(0, time))).filter((time, index, list) => index === 0 || time - list[index - 1] >= clipDuration * 0.65);
}

export function createDeterministicPlan(project, analyzedSources, options = {}) {
  const style = studioStyleParameters(project.style);
  const target = Number(project.duration);
  const selectedTransition = studioTransitionParameters(project.transition, project.style);
  const transition = Number(project.transitionDuration || style.transitionSeconds);
  const automaticTransitions = AUTO_TRANSITIONS[project.style] || [selectedTransition.ffmpeg];
  const desiredClips = Math.max(analyzedSources.length, Math.ceil(target / style.maxClipSeconds));
  const nominal = Math.max(style.minClipSeconds, Math.min(style.maxClipSeconds, (target + transition * Math.max(0, desiredClips - 1)) / desiredClips));
  const candidates = analyzedSources.flatMap((source) => candidateStarts(source, nominal).map((start) => ({ source, start })));
  const ordered = candidates.length ? candidates : analyzedSources.map((source) => ({ source, start: 0 }));
  const scenes = [];
  let timeline = 0;
  let cursor = 0;
  while (timeline < target - 0.05 && scenes.length < 80) {
    const candidate = ordered[cursor % ordered.length];
    const remaining = target - timeline;
    const duration = Math.min(nominal, remaining + (scenes.length ? transition : 0));
    if (duration < 0.5) break;
    const transitionName = project.transition && project.transition !== "auto" ? selectedTransition.ffmpeg : automaticTransitions[scenes.length % automaticTransitions.length];
    const appliedTransitionDuration = scenes.length && transitionName !== "hardcut" ? transition : 0;
    scenes.push({
      id: `scene-${scenes.length + 1}`,
      sourceId: candidate.source.id,
      sourceIndex: candidate.source.order,
      start: candidate.source.contentType.startsWith("image/") ? 0 : candidate.start,
      duration: Math.round(duration * 1000) / 1000,
      transition: scenes.length ? transitionName : "none",
      transitionDuration: appliedTransitionDuration,
      hasSpeech: candidate.source.metadata.hasAudio && !candidate.source.technical.silences.some((silence) => candidate.start >= silence.start && candidate.start < silence.end)
    });
    timeline += duration - (scenes.length > 1 ? appliedTransitionDuration : 0);
    cursor += 1;
  }
  const plan = {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    planner: { type: "deterministic-technical", version: 1, semanticAnalysis: false },
    style: project.style,
    format: project.format,
    duration: target,
    transition: { mode: project.transition || "auto", name: selectedTransition.ffmpeg, duration: transition },
    text: { title: project.title || "", subtitle: project.subtitle || "", callToAction: project.callToAction || "" },
    textDesign: project.textDesign || {},
    textLayers: textLayersFor(project, target),
    captions: { enabled: project.captionsEnabled === true && options.transcription?.available === true, provider: options.transcription?.provider || "disabled", segments: options.transcription?.segments || [] },
    music: { enabled: Boolean(project.music), volume: style.musicVolume, duckDuringSpeech: true },
    logo: { enabled: Boolean(project.logo), position: "center", start: Math.max(0, target - 5), end: target - 0.1, size: 0.22 },
    scenes
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano tecnico invalido: ${validation.errors.join(" ")}`);
  return plan;
}
