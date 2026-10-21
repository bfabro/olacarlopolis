import { STUDIO_SCHEMA_VERSION, studioStyleParameters, validateEditPlan } from "../../shared/studio-contracts.mjs";

function candidateStarts(source, clipDuration) {
  if (source.contentType.startsWith("image/")) return [0];
  const maxStart = Math.max(0, source.metadata.duration - clipDuration);
  const sceneStarts = source.technical.sceneTimes.length ? source.technical.sceneTimes : [0];
  return sceneStarts.map((time) => Math.min(maxStart, Math.max(0, time))).filter((time, index, list) => index === 0 || time - list[index - 1] >= clipDuration * 0.65);
}

export function createDeterministicPlan(project, analyzedSources, options = {}) {
  const style = studioStyleParameters(project.style);
  const target = Number(project.duration);
  const transition = style.transitionSeconds;
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
    scenes.push({
      id: `scene-${scenes.length + 1}`,
      sourceId: candidate.source.id,
      sourceIndex: candidate.source.order,
      start: candidate.source.contentType.startsWith("image/") ? 0 : candidate.start,
      duration: Math.round(duration * 1000) / 1000,
      transition: scenes.length ? style.transition : "none",
      transitionDuration: scenes.length ? transition : 0,
      hasSpeech: candidate.source.metadata.hasAudio && !candidate.source.technical.silences.some((silence) => candidate.start >= silence.start && candidate.start < silence.end)
    });
    timeline += duration - (scenes.length > 1 ? transition : 0);
    cursor += 1;
  }
  const plan = {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    planner: { type: "deterministic-technical", version: 1, semanticAnalysis: false },
    style: project.style,
    format: project.format,
    duration: target,
    transition: { name: style.transition, duration: transition },
    text: { title: project.title || "", subtitle: project.subtitle || "", callToAction: project.callToAction || "" },
    captions: { enabled: project.captionsEnabled === true && options.transcription?.available === true, provider: options.transcription?.provider || "disabled", segments: options.transcription?.segments || [] },
    music: { enabled: Boolean(project.music), volume: style.musicVolume, duckDuringSpeech: true },
    logo: { enabled: Boolean(project.logo), position: "top-right" },
    scenes
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano tecnico invalido: ${validation.errors.join(" ")}`);
  return plan;
}
