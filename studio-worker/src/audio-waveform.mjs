import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

export function waveformFromPcm(buffer, bins = 96) {
  const sampleCount = Math.floor(buffer.length / 2);
  if (!sampleCount) return [];
  const result = [];
  for (let bin = 0; bin < bins; bin += 1) {
    const start = Math.floor(bin * sampleCount / bins);
    const end = Math.max(start + 1, Math.floor((bin + 1) * sampleCount / bins));
    let peak = 0;
    let energy = 0;
    let count = 0;
    for (let index = start; index < end && index < sampleCount; index += 1) {
      const value = Math.abs(buffer.readInt16LE(index * 2) / 32768);
      peak = Math.max(peak, value);
      energy += value * value;
      count += 1;
    }
    result.push(round(Math.min(1, Math.max(peak * 0.65, Math.sqrt(energy / Math.max(1, count)) * 1.8))));
  }
  return result;
}

export async function analyzeAudioWaveform(localPath, metadata, signal) {
  if (!metadata?.hasAudio) return { available: false, samples: [], duration: Number(metadata?.duration || 0), method: "none" };
  await fs.mkdir(workerConfig.workRoot, { recursive: true });
  const pcmPath = path.join(workerConfig.workRoot, `.waveform-${crypto.randomUUID()}.pcm`);
  try {
    await runProcess(workerConfig.ffmpegPath, ["-y", "-hide_banner", "-i", localPath, "-vn", "-ac", "1", "-ar", "1000", "-f", "s16le", pcmPath], { signal });
    const samples = waveformFromPcm(await fs.readFile(pcmPath), 96);
    return { available: samples.some((value) => value > 0.002), samples, duration: round(metadata.duration), method: "pcm-envelope-v1" };
  } finally {
    await fs.rm(pcmPath, { force: true }).catch(() => {});
  }
}

export function composePlanWaveform(scenes, analyzedSources, duration, bins = 120) {
  const sourceById = new Map(analyzedSources.map((source) => [source.id, source]));
  const timeline = [];
  let cursor = 0;
  for (const [index, scene] of scenes.entries()) {
    const overlap = index ? Number(scene.transitionDuration || 0) : 0;
    cursor -= overlap;
    timeline.push({ start: cursor, end: cursor + Number(scene.duration || 0), scene, source: sourceById.get(scene.sourceId) });
    cursor += Number(scene.duration || 0);
  }
  const samples = Array.from({ length: bins }, (_, bin) => {
    const time = (bin + 0.5) / bins * Number(duration || cursor || 1);
    const matches = timeline.filter((item) => time >= item.start && time <= item.end);
    if (!matches.length) return 0;
    return round(Math.max(...matches.map((item) => {
      const waveform = item.source?.technical?.waveform;
      if (!waveform?.available || !waveform.samples?.length) return 0;
      const sourceTime = Number(item.scene.start || 0) + Math.max(0, time - item.start);
      const position = Math.max(0, Math.min(0.999, sourceTime / Math.max(0.001, Number(waveform.duration || item.source.metadata?.duration || 1))));
      return Number(waveform.samples[Math.floor(position * waveform.samples.length)] || 0);
    })));
  });
  return { available: samples.some((value) => value > 0.002), samples, bins, method: "scene-composition-envelope-v1" };
}
