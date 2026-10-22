import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runProcess } from "../src/process-utils.mjs";
import { buildBrandingArgs } from "../src/renderer.mjs";
import { generateLibraryMusic, generateTransitionSoundtrack } from "../src/sound-library.mjs";

const integration = process.env.STUDIO_INTEGRATION === "1" ? test : test.skip;

integration("renderiza trilha original e efeitos de transição em MP4 reproduzível", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "ola-studio-sound-"));
  try {
    const base = path.join(folder, "base.mp4");
    const music = path.join(folder, "music.wav");
    const effects = path.join(folder, "effects.wav");
    const output = path.join(folder, "output.mp4");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=#092B45:s=360x640:d=3:r=30", "-f", "lavfi", "-i", "sine=frequency=220:duration=3:sample_rate=48000", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", base]);
    await generateLibraryMusic("corporate", 3, music);
    await generateTransitionSoundtrack("subtle", { duration: 3, scenes: [{ duration: 1.5 }, { duration: 1.2, transition: "fade", transitionDuration: 0.2 }, { duration: 0.9, transition: "wipeleft", transitionDuration: 0.2 }] }, effects);
    const args = buildBrandingArgs({ inputPath: base, outputPath: output, duration: 3, format: "9:16", musicPath: music, soundEffectsPath: effects, plan: { textLayers: [], music: { volume: 0.18, duckDuringSpeech: true }, audio: { musicVolume: 0.18, voiceVolume: 1, fadeSeconds: 0.3 } } });
    await runProcess("ffmpeg", args);
    const probe = await runProcess("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", output]);
    const metadata = JSON.parse(probe.stdout);
    assert.ok(metadata.streams.some((stream) => stream.codec_type === "video" && stream.width === 360 && stream.height === 640));
    assert.ok(metadata.streams.some((stream) => stream.codec_type === "audio"));
    assert.ok(Number(metadata.format.duration) >= 2.8);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
