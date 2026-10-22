import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "../src/process-utils.mjs";
import { probeMedia, analyzeSources } from "../src/analyzer.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { prepareVisualEditorPlan } from "../src/editor-plan.mjs";
import { renderPlan } from "../src/renderer.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 5 usa o mesmo plano editado na prévia e na exportação final", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase5-"));
  try {
    const sourcePaths = [path.join(root, "blue.mp4"), path.join(root, "yellow.mp4")];
    const musicPath = path.join(root, "music.wav");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x0C5F91:s=360x640:d=4:r=30", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", sourcePaths[0]]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0xFFBB2D:s=360x640:d=4:r=30", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=4", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", sourcePaths[1]]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=6", musicPath]);
    const sources = await analyzeSources(sourcePaths.map((localPath, index) => ({ id: `source-${index + 1}`, order: index, contentType: "video/mp4", localPath })));
    const base = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, title: "Título antigo", export: { fps: 24, quality: "high" } }, sources);
    const edited = prepareVisualEditorPlan({ ...base, text: { title: "Título alterado", subtitle: "Prévia fiel", callToAction: "Confira agora" }, textLayers: base.textLayers.map((layer) => layer.type === "title" ? { ...layer, font: "serif", sizeScale: 1.5, color: "#FFBB2D", outlineColor: "#092B45", align: "center", background: true } : layer), audio: { ...base.audio, voiceVolume: 1.15, musicVolume: 0.12, fadeSeconds: 0.8, noiseReduction: true }, music: { ...base.music, duckDuringSpeech: false }, scenes: [{ ...base.scenes[1], start: 0.5, duration: 2 }, { ...base.scenes[0], start: 1, duration: 2, transition: "dissolve", transitionDuration: 0.3 }] }, base, sources);
    const previewDir = path.join(root, "preview");
    const finalDir = path.join(root, "final");
    await fs.mkdir(previewDir);
    await fs.mkdir(finalDir);
    const preview = await renderPlan({ plan: structuredClone(edited), sources, outputDir: previewDir, musicPath, renderProfile: "preview" });
    const final = await renderPlan({ plan: structuredClone(edited), sources, outputDir: finalDir, musicPath, renderProfile: "final" });
    const previewMeta = await probeMedia(preview.outputPath, "video/mp4");
    const finalMeta = await probeMedia(final.outputPath, "video/mp4");
    assert.deepEqual({ width: previewMeta.width, height: previewMeta.height }, { width: 360, height: 640 });
    assert.deepEqual({ width: finalMeta.width, height: finalMeta.height }, { width: 1080, height: 1920 });
    assert.equal(previewMeta.frameRate, 24);
    assert.equal(finalMeta.frameRate, 24);
    assert.ok(Math.abs(previewMeta.duration - edited.duration) < 0.35);
    assert.ok(Math.abs(finalMeta.duration - edited.duration) < 0.35);
    assert.equal(preview.plan.text.title, "Título alterado");
    assert.equal(final.plan.scenes[1].transition, "dissolve");
    assert.equal(final.plan.scenes[1].start, 1);
    assert.equal(final.plan.audio.voiceVolume, 1.15);
    assert.equal(final.plan.music.duckDuringSpeech, false);
    assert.equal(final.plan.textLayers.find((layer) => layer.type === "title").sizeScale, 1.5);
    assert.equal(final.plan.audio.waveform.available, true);
    assert.equal(final.plan.audio.waveform.samples.length, 120);
    assert.deepEqual(final.plan.export, { fps: 24, quality: "high", codec: "h264", audioCodec: "aac", videoBitrateKbps: 12000, audioBitrateKbps: 192 });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
