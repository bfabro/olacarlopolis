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

export function detectMusicalStructure(energies = [], windowMs = 50) {
  if (energies.length < 20) return { available: false, sections: [], peaks: [], method: "none" };
  const duration = energies.length * windowMs / 1000;
  const sectionCount = Math.max(3, Math.min(8, Math.round(duration / 8)));
  const size = Math.ceil(energies.length / sectionCount);
  const maximum = Math.max(...energies, 0.0001);
  const sections = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const values = energies.slice(index * size, Math.min(energies.length, (index + 1) * size));
    if (!values.length) continue;
    const intensity = values.reduce((sum, value) => sum + value, 0) / values.length / maximum;
    const firstHalf = values.slice(0, Math.ceil(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const first = firstHalf.reduce((sum, value) => sum + value, 0) / Math.max(1, firstHalf.length);
    const second = secondHalf.reduce((sum, value) => sum + value, 0) / Math.max(1, secondHalf.length);
    const trend = second > first * 1.12 ? "rising" : second < first * 0.88 ? "falling" : "steady";
    sections.push({ start: round(index * size * windowMs / 1000), end: round(Math.min(duration, (index + 1) * size * windowMs / 1000)), intensity: round(intensity), trend, role: "body" });
  }
  const strongest = Math.max(...sections.map((section) => section.intensity));
  sections.forEach((section, index) => {
    section.role = index === 0 ? "intro" : index === sections.length - 1 ? "outro" : section.intensity >= strongest * 0.9 ? "peak" : section.trend === "rising" ? "build" : section.intensity <= strongest * 0.45 ? "calm" : "body";
  });
  const peaks = sections.filter((section) => section.role === "peak").map((section) => round((section.start + section.end) / 2));
  return { available: true, sections, peaks, method: "pcm-energy-sections-v1" };
}

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
  if (energies.length < 4) return { available: false, bpm: 0, confidence: 0, beatTimes: [], intensity: 0, structure: { available: false, sections: [], peaks: [], method: "none" }, waveform: { available: false, samples: [], method: "none" }, method: "pcm-energy-onset-v1" };
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
  return { available: beatTimes.length >= 3, bpm: round(bpm, 1), confidence: round(confidence), beatTimes, intensity: round(Math.min(1, meanEnergy * 6)), structure: detectMusicalStructure(energies, windowMs), waveform: { available: waveformSamples.some((value) => value > 0.002), samples: waveformSamples, bins: waveformSamples.length, method: "music-pcm-envelope-v1" }, method: "pcm-energy-onset-v2" };
}

export async function analyzeMusicRhythm(localPath, workDir, signal) {
  if (!localPath) return { available: false, bpm: 0, confidence: 0, beatTimes: [], intensity: 0, structure: { available: false, sections: [], peaks: [], method: "none" }, waveform: { available: false, samples: [], method: "none" }, method: "none" };
  const pcmPath = path.join(workDir, "music-rhythm.pcm");
  try {
    await runProcess(workerConfig.ffmpegPath, ["-y", "-hide_banner", "-i", localPath, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", pcmPath], { signal });
    return detectRhythmFromPcm(await fs.readFile(pcmPath), 8000, 50);
  } finally {
    await fs.rm(pcmPath, { force: true }).catch(() => {});
  }
}
