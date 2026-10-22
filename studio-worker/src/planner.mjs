import { STUDIO_EXPORT_FPS, STUDIO_EXPORT_QUALITIES, STUDIO_LIBRARY_MUSIC, STUDIO_SCHEMA_VERSION, STUDIO_TRANSITION_SOUNDS, studioStyleParameters, studioTransitionParameters, validateEditPlan } from "../../shared/studio-contracts.mjs";
import { composePlanWaveform } from "./audio-waveform.mjs";

const AUTO_TRANSITIONS = Object.freeze({
  institucional: ["fade", "dissolve", "fadeblack"], comercial: ["fadeblack", "fadewhite", "dissolve"], reels: ["smoothleft", "fadewhite", "hardcut", "slideleft"],
  comercio_local: ["dissolve", "slideleft", "fade"], imoveis: ["smoothleft", "dissolve", "fade"], gastronomia: ["zoomin", "dissolve", "fadewhite"],
  eventos: ["fadewhite", "smoothleft", "hardcut"], turismo: ["fade", "dissolve", "fadeblack"]
});

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

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

function qualityAt(source, start, clipDuration) {
  const windows = source.technical?.qualityWindows || [];
  const matching = windows.filter((window) => window.end > start && window.start < start + clipDuration);
  if (!matching.length) return { score: 0.65, flags: [] };
  return {
    score: round(matching.reduce((sum, window) => sum + Number(window.score || 0), 0) / matching.length),
    flags: [...new Set(matching.flatMap((window) => window.flags || []))]
  };
}

function candidateStarts(source, clipDuration) {
  if (source.contentType.startsWith("image/")) return [0];
  const maxStart = Math.max(0, source.metadata.duration - clipDuration);
  const raw = [0, ...(source.technical?.sceneTimes || []), ...(source.technical?.silences || []).map((silence) => silence.end), ...(source.technical?.qualityWindows || []).filter((window) => window.score >= 0.72).map((window) => window.start)];
  return [...new Set(raw.map((time) => round(Math.min(maxStart, Math.max(0, Number(time || 0))))))].sort((a, b) => a - b).filter((time, index, list) => index === 0 || time - list[index - 1] >= Math.max(0.75, clipDuration * 0.45));
}

function candidateHasSpeech(candidate) {
  if (!candidate.source.metadata.hasAudio) return false;
  return !(candidate.source.technical?.silences || []).some((silence) => candidate.start >= silence.start && candidate.start < silence.end);
}

function narrativeRole(timeline, target) {
  if (timeline < target * 0.18) return "opening";
  if (timeline > target * 0.78) return "closing";
  return "development";
}

function selectCandidate(candidates, scenes, timeline, target) {
  const role = narrativeRole(timeline, target);
  const previous = scenes.at(-1);
  const usage = new Map(scenes.map((scene) => [scene.sourceId, (scenes.filter((item) => item.sourceId === scene.sourceId).length)]));
  return [...candidates].sort((left, right) => {
    const score = (candidate) => {
      let value = candidate.quality.score * 10 - (candidate.quality.flags.includes("dark") ? 5 : 0) - (candidate.quality.flags.includes("frozen") ? 4 : 0) - (candidate.quality.flags.includes("blurred") ? 3 : 0) - (candidate.quality.flags.includes("shaky") ? 2.5 : 0);
      if (candidate.source.id !== previous?.sourceId) value += 3;
      value -= Number(usage.get(candidate.source.id) || 0) * 1.8;
      if (scenes.some((scene) => scene.sourceId === candidate.source.id && Math.abs(scene.start - candidate.start) < 0.1)) value -= 3.5;
      if (role === "opening" && candidate.source.metadata.orientation === "landscape") value += 0.8;
      if (role === "closing" && candidate.quality.score >= 0.75) value += 1;
      return value;
    };
    return score(right) - score(left) || left.source.order - right.source.order || left.start - right.start;
  })[0];
}

function syncedDuration(timeline, nominal, transition, minClip, maxClip, rhythm, hasSpeech) {
  if (!rhythm?.available || !rhythm?.syncEnabled || hasSpeech) return nominal;
  const desiredEnd = timeline + nominal - transition;
  const minEnd = timeline + minClip - transition;
  const maxEnd = timeline + maxClip - transition;
  const beats = rhythm.beatTimes.filter((beat) => beat >= minEnd && beat <= maxEnd);
  if (!beats.length) return nominal;
  const beat = beats.reduce((best, value) => Math.abs(value - desiredEnd) < Math.abs(best - desiredEnd) ? value : best, beats[0]);
  return round(Math.max(minClip, Math.min(maxClip, beat - timeline + transition)));
}

export function createDeterministicPlan(project, analyzedSources, options = {}) {
  const style = studioStyleParameters(project.style);
  const target = Number(project.duration);
  const selectedTransition = studioTransitionParameters(project.transition, project.style);
  const transition = Number(project.transitionDuration || style.transitionSeconds);
  const automaticTransitions = AUTO_TRANSITIONS[project.style] || [selectedTransition.ffmpeg];
  const rhythmLevel = project.editing?.rhythm || "balanced";
  const exportFps = STUDIO_EXPORT_FPS.includes(Number(project.export?.fps)) ? Number(project.export.fps) : 30;
  const exportQuality = STUDIO_EXPORT_QUALITIES[project.export?.quality] || STUDIO_EXPORT_QUALITIES.balanced;
  const libraryMusic = STUDIO_LIBRARY_MUSIC[project.libraryMusic] ? project.libraryMusic : "none";
  const transitionSound = STUDIO_TRANSITION_SOUNDS[project.transitionSound] ? project.transitionSound : "none";
  const paceFactor = rhythmLevel === "soft" ? 1.22 : rhythmLevel === "dynamic" ? 0.78 : 1;
  const minClip = Math.max(0.8, style.minClipSeconds * paceFactor);
  const maxClip = Math.max(minClip + 0.4, style.maxClipSeconds * paceFactor);
  const desiredClips = Math.max(analyzedSources.length, Math.ceil(target / maxClip));
  const nominal = Math.max(minClip, Math.min(maxClip, (target + transition * Math.max(0, desiredClips - 1)) / desiredClips));
  const candidates = analyzedSources.flatMap((source) => candidateStarts(source, nominal).map((start) => ({ source, start, quality: qualityAt(source, start, nominal) })));
  if (!candidates.length) throw new Error("Nenhum trecho técnico válido foi encontrado nos arquivos enviados.");
  const rhythm = { ...(options.rhythm || {}), syncEnabled: project.editing?.syncToMusic === true && options.rhythm?.available === true };
  const scenes = [];
  let timeline = 0;
  while (timeline < target - 0.05 && scenes.length < 80) {
    const candidate = selectCandidate(candidates, scenes, timeline, target);
    const remaining = target - timeline;
    const transitionName = project.transition && project.transition !== "auto" ? selectedTransition.ffmpeg : automaticTransitions[scenes.length % automaticTransitions.length];
    const appliedTransitionDuration = scenes.length && transitionName !== "hardcut" ? transition : 0;
    const hasSpeech = candidateHasSpeech(candidate);
    let duration = syncedDuration(timeline, nominal, appliedTransitionDuration, minClip, maxClip, rhythm, hasSpeech);
    duration = Math.min(duration, remaining + appliedTransitionDuration);
    if (duration < 0.5) break;
    const role = narrativeRole(timeline, target);
    scenes.push({
      id: `scene-${scenes.length + 1}`, sourceId: candidate.source.id, sourceIndex: candidate.source.order,
      start: candidate.source.contentType.startsWith("image/") ? 0 : candidate.start, duration: round(duration),
      transition: scenes.length ? transitionName : "none", transitionDuration: appliedTransitionDuration, hasSpeech,
      narrativeRole: role,
      selection: { method: "technical-quality-v3", qualityScore: candidate.quality.score, flags: candidate.quality.flags, reason: candidate.quality.flags.length ? "Melhor alternativa técnica disponível com penalidades registradas." : "Trecho priorizado por nitidez, estabilidade, exposição, movimento e diversidade de origem." },
      rhythmSynced: rhythm.syncEnabled && !hasSpeech && Math.abs(duration - nominal) > 0.01
    });
    timeline += duration - appliedTransitionDuration;
  }
  const plan = {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    planner: { type: "deterministic-technical", version: 2, semanticAnalysis: false, technicalSelection: true, narrativeTemplate: "opening-development-closing" },
    analysis: { sources: analyzedSources.map((source) => ({ sourceId: source.id, contentType: source.contentType, duration: Number(source.metadata?.duration || 0), hasAudio: source.metadata?.hasAudio === true, orientation: source.metadata.orientation, method: source.technical?.analysisMethod || "unknown", sceneChanges: source.technical?.sceneTimes?.length || 0, qualityWindows: source.technical?.qualityWindows?.length || 0, waveform: source.technical?.waveform || { available: false, samples: [] } })) },
    rhythm: { available: Boolean(rhythm.available), syncEnabled: Boolean(rhythm.syncEnabled), level: rhythmLevel, bpm: Number(rhythm.bpm || 0), confidence: Number(rhythm.confidence || 0), method: rhythm.method || "none", beatCount: rhythm.beatTimes?.length || 0 },
    style: project.style, format: project.format, duration: target, export: { fps: exportFps, quality: exportQuality.id, codec: "h264", audioCodec: "aac", videoBitrateKbps: exportQuality.videoBitrateKbps, audioBitrateKbps: exportQuality.audioBitrateKbps },
    transition: { mode: project.transition || "auto", name: selectedTransition.ffmpeg, duration: transition },
    text: { title: project.title || "", subtitle: project.subtitle || "", callToAction: project.callToAction || "" }, textDesign: project.textDesign || {}, textLayers: textLayersFor(project, target),
    captions: { requested: project.captionsEnabled === true, enabled: project.captionsEnabled === true && options.transcription?.available === true, provider: options.transcription?.provider || "pending", segments: options.transcription?.segments || [], ...(project.captions || {}) },
    audio: { musicVolume: style.musicVolume, voiceVolume: 1, fadeSeconds: 1.2, noiseReduction: false, ...(project.audio || {}), waveform: rhythm.waveform?.available ? rhythm.waveform : composePlanWaveform(scenes, analyzedSources, target) },
    music: { enabled: Boolean(project.music) || libraryMusic !== "none", source: project.music ? "upload" : libraryMusic !== "none" ? "original-library" : "none", libraryTrack: libraryMusic, volume: Number(project.audio?.musicVolume ?? style.musicVolume), duckDuringSpeech: true },
    soundEffects: { preset: transitionSound, source: transitionSound !== "none" ? "original-library" : "none" },
    logo: { enabled: Boolean(project.logo), position: "center", start: Math.max(0, target - 5), end: target - 0.1, size: 0.22 }, scenes
  };
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano tecnico invalido: ${validation.errors.join(" ")}`);
  return plan;
}
