import path from "node:path";
import { STUDIO_LIBRARY_MUSIC, STUDIO_TRANSITION_SOUNDS } from "../../shared/studio-contracts.mjs";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";

const seconds = (value) => Math.max(0.01, Number(value || 0)).toFixed(3);

export function libraryMusicDefinition(trackId) {
  const id = STUDIO_LIBRARY_MUSIC[trackId] ? trackId : "none";
  const definitions = {
    ambient: { frequencies: [174.61, 261.63, 349.23], volumes: [0.045, 0.032, 0.022], lowpass: 1800, tremoloFrequency: 0.1, tremoloDepth: 0.18 },
    corporate: { frequencies: [261.63, 329.63, 392], volumes: [0.05, 0.038, 0.028], lowpass: 2600, tremoloFrequency: 0.18, tremoloDepth: 0.22 },
    dynamic: { frequencies: [110, 220, 440], volumes: [0.065, 0.04, 0.025], lowpass: 3400, tremoloFrequency: 2, tremoloDepth: 0.55 }
  };
  return id === "none" ? null : { id, ...definitions[id] };
}

export async function generateLibraryMusic(trackId, duration, outputPath, signal) {
  const definition = libraryMusicDefinition(trackId);
  if (!definition) return "";
  const safeDuration = Math.max(1, Math.min(95, Number(duration || 30) + 1));
  const args = ["-y"];
  definition.frequencies.forEach((frequency) => args.push("-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${seconds(safeDuration)}`));
  const filters = definition.frequencies.map((_, index) => `[${index}:a]volume=${definition.volumes[index]},tremolo=f=${definition.tremoloFrequency}:d=${definition.tremoloDepth}[tone${index}]`);
  filters.push(`${definition.frequencies.map((_, index) => `[tone${index}]`).join("")}amix=inputs=${definition.frequencies.length}:normalize=0,lowpass=f=${definition.lowpass},highpass=f=70,afade=t=in:st=0:d=1.2,afade=t=out:st=${seconds(Math.max(0, safeDuration - 1.5))}:d=1.5,loudnorm=I=-24:LRA=7:TP=-3[aout]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[aout]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", outputPath);
  await runProcess(workerConfig.ffmpegPath, args, { signal });
  return outputPath;
}

export function transitionEffectEvents(plan = {}) {
  const scenes = Array.isArray(plan.scenes) ? plan.scenes : [];
  const events = [];
  let elapsed = Number(scenes[0]?.duration || 0);
  for (let index = 1; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const transitionDuration = scene.transition === "hardcut" ? 0 : Number(scene.transitionDuration || 0);
    if (transitionDuration > 0) events.push({ index, time: Math.max(0, elapsed - transitionDuration), duration: Math.min(0.35, Math.max(0.1, transitionDuration)) });
    elapsed += Number(scene.duration || 0) - transitionDuration;
  }
  return events.slice(0, 30);
}

export async function generateTransitionSoundtrack(presetId, plan, outputPath, signal) {
  const preset = STUDIO_TRANSITION_SOUNDS[presetId] ? presetId : "none";
  const events = transitionEffectEvents(plan);
  if (preset === "none" || !events.length) return "";
  const definitions = {
    subtle: { frequency: 520, volume: 0.06 },
    impact: { frequency: 95, volume: 0.12 },
    sparkle: { frequency: 1180, volume: 0.055 }
  };
  const definition = definitions[preset];
  const duration = Math.max(1, Number(plan.duration || 1));
  const args = ["-y", "-f", "lavfi", "-i", `anullsrc=r=48000:cl=stereo:d=${seconds(duration)}`];
  events.forEach((event) => args.push("-f", "lavfi", "-i", `sine=frequency=${definition.frequency}:sample_rate=48000:duration=${seconds(event.duration)}`));
  const filters = events.map((event, index) => {
    const delay = Math.round(event.time * 1000);
    const fadeOut = Math.max(0.04, event.duration * 0.72);
    return `[${index + 1}:a]volume=${definition.volume},afade=t=in:st=0:d=0.02,afade=t=out:st=${seconds(Math.max(0.02, event.duration - fadeOut))}:d=${seconds(fadeOut)},adelay=${delay}|${delay}[fx${index}]`;
  });
  filters.push(`[0:a]${events.map((_, index) => `[fx${index}]`).join("")}amix=inputs=${events.length + 1}:duration=first:normalize=0,atrim=duration=${seconds(duration)}[aout]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[aout]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", outputPath);
  await runProcess(workerConfig.ffmpegPath, args, { signal });
  return outputPath;
}

export function generatedAudioPaths(workDir) {
  return { music: path.join(workDir, "library-music.wav"), effects: path.join(workDir, "transition-effects.wav") };
}
