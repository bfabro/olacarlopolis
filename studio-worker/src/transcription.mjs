import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";

const secondsFromWhisper = (value, fallback = 0) => {
  if (Number.isFinite(Number(value))) return Math.max(0, Number(value) / 1000);
  const match = String(value || "").match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`) : fallback;
};

const cleanToken = (value) => String(value || "").replace(/<\|[^>]+\|>/g, "").replace(/\s+/g, " ").trim();

export function parseWhisperJson(payload = {}) {
  const segments = [];
  for (const [index, item] of (payload.transcription || []).entries()) {
    const start = secondsFromWhisper(item.offsets?.from ?? item.timestamps?.from);
    const end = Math.max(start + 0.05, secondsFromWhisper(item.offsets?.to ?? item.timestamps?.to, start + 0.5));
    const words = (item.tokens || []).map((token) => {
      const value = cleanToken(token.text);
      if (!value || /^\[[^\]]+\]$/.test(value)) return null;
      const wordStart = secondsFromWhisper(token.offsets?.from ?? token.timestamps?.from, start);
      const wordEnd = Math.max(wordStart + 0.03, secondsFromWhisper(token.offsets?.to ?? token.timestamps?.to, end));
      const probability = Number(token.p ?? token.probability ?? 1);
      return { text: value, start: wordStart, end: wordEnd, confidence: Number.isFinite(probability) ? probability : 1 };
    }).filter(Boolean);
    const value = cleanToken(item.text) || words.map((word) => word.text).join(" ");
    if (!value) continue;
    const confidences = words.map((word) => word.confidence).filter(Number.isFinite);
    const confidence = confidences.length ? confidences.reduce((sum, number) => sum + number, 0) / confidences.length : null;
    segments.push({ id: `caption-${index + 1}`, start, end, text: value, words, confidence });
  }
  return { language: payload.result?.language || payload.params?.language || "pt", segments };
}

export class DisabledTranscriptionProvider {
  get name() { return "disabled"; }
  async transcribeFile() { return { available: false, provider: this.name, language: "pt", segments: [], reason: "Whisper local não está disponível no worker." }; }
}

export class WhisperCppTranscriptionProvider {
  get name() { return "whisper.cpp"; }
  async transcribeFile(mediaPath, workDir, options = {}) {
    const wavPath = path.join(workDir, "transcription-audio.wav");
    const outputBase = path.join(workDir, "transcription");
    await runProcess(workerConfig.ffmpegPath, ["-y", "-i", mediaPath, "-vn", "-af", "highpass=f=80,lowpass=f=9000", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath], { signal: options.signal });
    const args = ["-m", workerConfig.whisperModel, "-f", wavPath, "-l", "pt", "-t", String(workerConfig.whisperThreads), "-ojf", "-of", outputBase, "-ml", "1", "-wt", String(workerConfig.whisperWordThreshold), "-np", "--no-gpu"];
    if (options.prompt) args.push("--prompt", String(options.prompt).slice(0, 240));
    await runProcess(workerConfig.whisperPath, args, { signal: options.signal });
    const parsed = parseWhisperJson(JSON.parse(await fs.readFile(`${outputBase}.json`, "utf8")));
    return { available: true, provider: this.name, model: path.basename(workerConfig.whisperModel), ...parsed };
  }
}

export async function createTranscriptionProvider() {
  try {
    await fs.access(workerConfig.whisperModel);
    await runProcess(workerConfig.whisperPath, ["--help"], { timeoutMs: 10000 });
    return new WhisperCppTranscriptionProvider();
  } catch {
    return new DisabledTranscriptionProvider();
  }
}
