import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTranscriptionProvider } from "../src/transcription.mjs";
import { runProcess } from "../src/process-utils.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 2 executa Whisper local e devolve timestamps reais", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-whisper-"));
  try {
    const media = path.join(root, "fala.wav");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "flite=text='Ola Carlopolis informacao local':voice=slt", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", media]);
    const provider = await createTranscriptionProvider();
    assert.equal(provider.name, "whisper.cpp");
    const result = await provider.transcribeFile(media, root, { prompt: "Olá Carlópolis, informação local" });
    assert.equal(result.available, true);
    assert.equal(result.language, "pt");
    assert.ok(result.segments.length > 0);
    assert.ok(result.segments.every((segment) => segment.end > segment.start));
    assert.ok(result.segments.some((segment) => segment.words.length > 0));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
