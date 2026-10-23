import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";

const VOICES = new Set(["marin", "cedar"]);
const TONES = {
  professional: "Fale em português brasileiro com tom profissional, claro e natural.",
  warm: "Fale em português brasileiro com tom acolhedor, próximo e natural.",
  energetic: "Fale em português brasileiro com energia publicitária, sem gritar e mantendo dicção clara.",
  calm: "Fale em português brasileiro com tom calmo, elegante e inspirador."
};

export function wavDurationSeconds(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return 0;
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunk === "fmt " && size >= 16 && offset + 20 <= buffer.length) byteRate = buffer.readUInt32LE(offset + 16);
    if (chunk === "data") { dataSize = Math.min(size, buffer.length - offset - 8); break; }
    offset += 8 + size + (size % 2);
  }
  return byteRate > 0 ? Number((dataSize / byteRate).toFixed(3)) : 0;
}

export class OpenAISpeechProvider {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? workerConfig.openaiApiKey;
    this.model = options.model ?? workerConfig.openaiTtsModel;
    this.fetchImpl = options.fetchImpl || fetch;
    this.endpoint = options.endpoint || "https://api.openai.com/v1/audio/speech";
  }
  get enabled() { return Boolean(this.apiKey && this.model); }
  async synthesize({ script, voice = "marin", tone = "professional", outputDir, fileName = "ai-narration.wav", signal }) {
    const input = String(script || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!input) return { available: false, reason: "Roteiro vazio." };
    if (!this.enabled) return { available: false, reason: "Narração por IA não configurada no worker." };
    const selectedVoice = VOICES.has(voice) ? voice : "marin";
    const timeoutSignal = AbortSignal.timeout(workerConfig.ttsTimeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, voice: selectedVoice, input, instructions: TONES[tone] || TONES.professional, response_format: "wav" }),
      signal: requestSignal
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw Object.assign(new Error(`A voz por IA respondeu HTTP ${response.status}: ${String(payload?.error?.message || "erro não detalhado").slice(0, 240)}`), { status: response.status, code: "openai_tts_error" });
    }
    const safeFileName = String(fileName || "ai-narration.wav").replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 120) || "ai-narration.wav";
    const target = path.join(outputDir, safeFileName);
    const audio = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(target, audio);
    const durationSeconds = wavDurationSeconds(audio);
    const estimatedCostUsd = Number(((durationSeconds / 60) * workerConfig.ttsUsdPerMinute).toFixed(6));
    return { available: true, localPath: target, provider: "openai", model: this.model, voice: selectedVoice, characters: input.length, durationSeconds, estimatedCostUsd };
  }
}

export function createSpeechProvider(options = {}) { return new OpenAISpeechProvider(options); }
