import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildAssCaptions } from "../src/captions.mjs";
import { buildBrandingArgs } from "../src/renderer.mjs";
import { runProcess } from "../src/process-utils.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 2 incorpora legenda dinâmica e música com ducking em MP4 real", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase2-"));
  try {
    const base = path.join(root, "base.mp4");
    const music = path.join(root, "music.wav");
    const captions = path.join(root, "captions.ass");
    const output = path.join(root, "phase2.mp4");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x092B45:s=360x640:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", base]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=180:sample_rate=48000:duration=4", "-c:a", "pcm_s16le", music]);
    const transcript = { segments: [{ start: 0.4, end: 3.4, text: "Olá Carlópolis informação local", words: [{ text: "Olá", start: 0.4, end: 1 }, { text: "Carlópolis", start: 1, end: 1.8 }, { text: "informação", start: 1.8, end: 2.6 }, { text: "local", start: 2.6, end: 3.4 }] }] };
    await fs.writeFile(captions, buildAssCaptions(transcript, { format: "9:16", mode: "dynamic", position: "bottom", color: "#FFFFFF", highlightColor: "#FFBB2D" }));
    await runProcess("ffmpeg", buildBrandingArgs({ inputPath: base, outputPath: output, duration: 4, format: "9:16", musicPath: music, captionsPath: captions, plan: { textLayers: [], audio: { musicVolume: 0.18, fadeSeconds: 0.8 }, music: { enabled: true } } }));
    const { stdout } = await runProcess("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", output]);
    const metadata = JSON.parse(stdout).format;
    assert.ok(Number(metadata.duration) >= 3.9 && Number(metadata.duration) <= 4.1);
    assert.ok(Number(metadata.size) > 10000);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
