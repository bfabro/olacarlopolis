import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";
import { waveformFromPcm } from "./audio-waveform.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));
const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function detectRhythmFromPcm(buffer, sampleRate = 8000, windowMs = 50) {
  const samplesPerWindow = Math.max(1, Math.round(sampleRate * windowMs / 1000));
  const energies = [];
  for (let offset = 0; offset + 1 < buffer.length; offset += samplesPerWindow * 2) {
    let sum = 0;
    let count = 0;
    const end = Math.min(buffer.length - 1, offset + samplesPerWindow * 2);
    for (let cursor = offset; cursor < end; cursor += 2) {
      const sample = buffer.readInt16LE(cursor) / 32768;
      sum += sample * sample;
      count += 1;
    }
    energies.push(Math.sqrt(sum / Math.max(1, count)));
  }
  if (energies.length < 4) return { available: false, bpm: 0, confidence: 0, beatTimes: [], intensity: 0, waveform: { available: false, samples: [], method: "none" }, method: "pcm-energy-onset-v1" };
  const flux = energies.map((value, index) => index ? Math.max(0, value - energies[index - 1]) : 0);
  const baseline = median(flux);
  const threshold = baseline + Math.max(0.002, median(flux.map((value) => Math.abs(value - baseline))) * 2.6);
  const beatTimes = [];
  const minGapWindows = Math.max(2, Math.round(240 / windowMs));
  for (let index = 1; index < flux.length - 1; index += 1) {
    if (flux[index] < threshold || flux[index] < flux[index - 1] || flux[index] < flux[index + 1]) continue;
    const time = index * windowMs / 1000;
    if (!beatTimes.length || index - Math.round(beatTimes.at(-1) * 1000 / windowMs) >= minGapWindows) beatTimes.push(round(time));
  }
  const intervals = beatTimes.slice(1).map((time, index) => time - beatTimes[index]).filter((gap) => gap >= 0.24 && gap <= 2);
  let bpm = intervals.length ? 60 / median(intervals) : 0;
  while (bpm && bpm < 70) bpm *= 2;
  while (bpm > 170) bpm /= 2;
  const meanEnergy = energies.reduce((sum, value) => sum + value, 0) / energies.length;
  const duration = energies.length * windowMs / 1000;
  const expected = bpm ? duration * bpm / 60 : 0;
  const confidence = expected ? Math.min(1, beatTimes.length / expected) : 0;
  const waveformSamples = waveformFromPcm(buffer, 120);
  return { available: beatTimes.length >= 3, bpm: round(bpm, 1), confidence: round(confidence), beatTimes, intensity: round(Math.min(1, meanEnergy * 6)), waveform: { available: waveformSamples.some((value) => value > 0.002), samples: waveformSamples, bins: waveformSamples.length, method: "music-pcm-envelope-v1" }, method: "pcm-energy-onset-v1" };
}

export async function analyzeMusicRhythm(localPath, workDir, signal) {
  if (!localPath) return { available: false, bpm: 0, confidence: 0, beatTimes: [], intensity: 0, waveform: { available: false, samples: [], method: "none" }, method: "none" };
  const pcmPath = path.join(workDir, "music-rhythm.pcm");
  try {
    await runProcess(workerConfig.ffmpegPath, ["-y", "-hide_banner", "-i", localPath, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", pcmPath], { signal });
    return detectRhythmFromPcm(await fs.readFile(pcmPath), 8000, 50);
  } finally {
    await fs.rm(pcmPath, { force: true }).catch(() => {});
  }
}
