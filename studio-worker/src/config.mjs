import os from "node:os";
import path from "node:path";

const numberEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const workerConfig = Object.freeze({
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://contadoracessos-default-rtdb.firebaseio.com",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "contadoracessos.firebasestorage.app",
  workRoot: process.env.STUDIO_WORK_DIR || path.join(os.tmpdir(), "ola-studio"),
  startupDelayMs: numberEnv("STUDIO_STARTUP_DELAY_MS", 2000),
  pollIntervalMs: numberEnv("STUDIO_POLL_INTERVAL_MS", 4000),
  databaseTimeoutMs: numberEnv("STUDIO_DATABASE_TIMEOUT_MS", 15000),
  maxAttempts: numberEnv("STUDIO_MAX_ATTEMPTS", 2),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  whisperPath: process.env.STUDIO_WHISPER_PATH || "whisper-cli",
  whisperModel: process.env.STUDIO_WHISPER_MODEL || "/opt/whisper/ggml-tiny.bin",
  whisperThreads: Math.max(1, Math.floor(numberEnv("STUDIO_WHISPER_THREADS", 2))),
  whisperWordThreshold: Math.min(1, numberEnv("STUDIO_WHISPER_WORD_THRESHOLD", 0.08)),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.STUDIO_OPENAI_MODEL || "",
  aiTimeoutMs: numberEnv("STUDIO_AI_TIMEOUT_MS", 90000),
  workerId: process.env.STUDIO_WORKER_ID || `${os.hostname()}-${process.pid}`,
  fontFile: process.env.STUDIO_FONT_FILE || "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
});
