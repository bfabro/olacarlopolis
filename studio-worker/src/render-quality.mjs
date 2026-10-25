import { workerConfig } from "./config.mjs";
import { parseIntervals, probeMedia } from "./analyzer.mjs";
import { runProcess } from "./process-utils.mjs";
import { studioOutputDimensions } from "../../shared/studio-contracts.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

export function inspectPlanConsistency(plan = {}) {
  const errors = [];
  const warnings = [];
  const duration = Number(plan.duration || 0);
  const captions = plan.captions?.segments || [];
  captions.forEach((segment, index) => {
    const start = Number(segment.start || 0);
    const end = Number(segment.end || 0);
    if (start < 0 || end <= start || end > duration + 0.15) errors.push({ code: "caption_out_of_bounds", message: `Legenda ${index + 1} está fora da duração do vídeo.` });
    if (index && start < Number(captions[index - 1].end || 0) - 0.08) warnings.push({ code: "caption_overlap", message: `Legendas ${index} e ${index + 1} se sobrepõem.` });
  });
  (plan.textLayers || []).forEach((layer, index) => {
    if (Number(layer.start || 0) < 0 || Number(layer.end || 0) > duration + 0.15 || Number(layer.end || 0) <= Number(layer.start || 0)) errors.push({ code: "text_out_of_bounds", message: `Texto ${index + 1} está fora da linha do tempo.` });
    if (Number(layer.margin || 64) < 24) warnings.push({ code: "text_safe_area", message: `Texto ${index + 1} usa margem inferior à área segura recomendada.` });
  });
  let assembledDuration = 0;
  (plan.scenes || []).forEach((scene, index, scenes) => {
    assembledDuration += Number(scene.duration || 0) - (index ? Number(scene.transitionDuration || 0) : 0);
    if (!index) return;
    const previous = scenes[index - 1];
    if (Number(scene.transitionDuration || 0) > Math.min(Number(scene.duration || 0), Number(previous.duration || 0)) / 2 + 0.01) errors.push({ code: "transition_out_of_bounds", message: `A transição para a cena ${index + 1} excede a duração segura dos planos.` });
    if (scene.sourceId === previous.sourceId && Math.abs(Number(scene.start || 0) - Number(previous.start || 0)) < 0.12) warnings.push({ code: "repeated_scene", message: `As cenas ${index} e ${index + 1} repetem o mesmo trecho.` });
  });
  if (Math.abs(assembledDuration - duration) > 0.2) errors.push({ code: "timeline_duration_mismatch", message: "A duração calculada da timeline diverge do plano final." });
  return { errors, warnings };
}

export async function inspectRenderedOutput(outputPath, plan, signal) {
  const objectiveChecks = [];
  const consistency = inspectPlanConsistency(plan);
  const metadata = await probeMedia(outputPath, "video/mp4", signal);
  const durationDelta = Math.abs(Number(metadata.duration || 0) - Number(plan.duration || 0));
  const expectedDimensions = studioOutputDimensions(plan.format);
  objectiveChecks.push({ id: "video_stream", passed: metadata.hasVideo === true, value: metadata.hasVideo });
  objectiveChecks.push({ id: "duration", passed: durationDelta <= 1.25, value: metadata.duration, expected: Number(plan.duration || 0), tolerance: 1.25 });
  objectiveChecks.push({ id: "dimensions", passed: metadata.width === expectedDimensions.width && metadata.height === expectedDimensions.height, value: { width: metadata.width, height: metadata.height }, expected: expectedDimensions });
  objectiveChecks.push({ id: "audio_stream", passed: metadata.hasAudio === true, value: metadata.hasAudio, severity: "warning" });
  const analysis = await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", outputPath, "-vf", "blackdetect=d=0.7:pix_th=0.10,freezedetect=n=-55dB:d=2.5", "-af", "volumedetect", "-f", "null", "-"], { signal }).catch((error) => ({ stdout: error.stdout || "", stderr: error.stderr || "" }));
  const log = `${analysis.stdout || ""}\n${analysis.stderr || ""}`;
  const blackIntervals = parseIntervals(log, "black").filter((interval) => interval.duration >= 0.7);
  const freezeIntervals = parseIntervals(log, "freeze").filter((interval) => interval.duration >= 2.5);
  const meanVolume = Number(log.match(/mean_volume:\s*(-?[0-9.]+)\s*dB/)?.[1]);
  const maxVolume = Number(log.match(/max_volume:\s*(-?[0-9.]+)\s*dB/)?.[1]);
  objectiveChecks.push({ id: "black_frames", passed: blackIntervals.length === 0, value: blackIntervals });
  objectiveChecks.push({ id: "audio_level", passed: !metadata.hasAudio || (Number.isFinite(meanVolume) && meanVolume > -55 && Number.isFinite(maxVolume) && maxVolume <= 0.2), value: { meanDb: Number.isFinite(meanVolume) ? meanVolume : null, maxDb: Number.isFinite(maxVolume) ? maxVolume : null }, severity: "warning" });
  const movingPhotos = (plan.scenes || []).filter((scene) => scene.photoMotion).length;
  objectiveChecks.push({ id: "long_freezes", passed: freezeIntervals.length === 0 || movingPhotos > 0, value: freezeIntervals, severity: "warning" });
  const errors = [...consistency.errors];
  const warnings = [...consistency.warnings];
  objectiveChecks.forEach((check) => {
    if (check.passed) return;
    const item = { code: `quality_${check.id}`, message: check.id === "duration" ? "A duração do MP4 diverge do plano." : check.id === "dimensions" ? "O MP4 final não corresponde ao formato selecionado." : check.id === "video_stream" ? "O MP4 final não contém vídeo." : check.id === "black_frames" ? "Foram detectados trechos pretos prolongados." : check.id === "audio_stream" ? "O MP4 final não contém faixa de áudio." : check.id === "audio_level" ? "O nível de áudio final pode estar inaudível ou saturado." : "Foram detectados quadros congelados prolongados." };
    (check.severity === "warning" ? warnings : errors).push(item);
  });
  return {
    version: 1,
    passed: errors.length === 0,
    inspectedAt: new Date().toISOString(),
    output: { duration: round(metadata.duration), width: metadata.width, height: metadata.height, frameRate: metadata.frameRate, hasVideo: metadata.hasVideo, hasAudio: metadata.hasAudio },
    objectiveChecks, errors, warnings,
    subjectiveReviewRequired: ["coerência narrativa", "naturalidade dos cortes", "enquadramento de pessoas", "adequação emocional da música"],
    repairAttempts: 0
  };
}
