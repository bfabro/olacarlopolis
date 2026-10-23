import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeSources, probeMedia } from "../src/analyzer.mjs";
import { buildAssCaptions } from "../src/captions.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { renderPlan } from "../src/renderer.mjs";
import { runProcess } from "../src/process-utils.mjs";
import { generateLibraryMusic, generateTransitionSoundtrack, generatedAudioPaths } from "../src/sound-library.mjs";

const integration = process.env.STUDIO_INTEGRATION === "1" ? test : test.skip;
const digest = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");

integration("aceitação final monta cinco vídeos em 30 segundos e permite nova renderização", { timeout: 300000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-acceptance-"));
  try {
    const colors = ["0x092B45", "0xFFBB2D", "0x0C5F91", "0x2E7D5B", "0x8A3FFC"];
    const sources = [];
    for (let index = 0; index < colors.length; index += 1) {
      const localPath = path.join(root, `source-${index + 1}.mp4`);
      await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", `color=c=${colors[index]}:s=360x640:d=8:r=30`, "-f", "lavfi", "-i", `sine=frequency=${260 + index * 90}:sample_rate=48000:duration=8`, "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", localPath]);
      sources.push({ id: `source-${index + 1}`, order: index, name: `Vídeo ${index + 1}`, contentType: "video/mp4", localPath });
    }
    const analyzed = await analyzeSources(sources);
    const project = { style: "institucional", format: "9:16", duration: 30, transition: "fade", transitionDuration: 0.35, title: "Olá Studio profissional", sceneDescription: "Texto sobre uma cena", closingText: "Feito para sua empresa", callToAction: "Conheça agora", logo: { id: "logo" }, libraryMusic: "corporate", transitionSound: "subtle", captionsEnabled: false, editing: { rhythm: "balanced", syncToMusic: false }, export: { fps: 30, quality: "compact" }, audio: { musicVolume: 0.18, voiceVolume: 1, fadeSeconds: 0.8 } };
    const plan = createDeterministicPlan(project, analyzed);
    assert.equal(new Set(plan.scenes.map((scene) => scene.sourceId)).size, 5);
    assert.ok(plan.textLayers.some((layer) => layer.type === "title" && layer.animation !== "none"));
    assert.ok(plan.textLayers.some((layer) => layer.type === "description"));
    assert.ok(plan.logo.enabled);

    const logo = path.join(root, "logo.png");
    const captions = path.join(root, "captions.ass");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0xFFBB2D:s=320x140", "-frames:v", "1", "-threads", "1", logo]);
    const transcript = { segments: [
      { start: 1, end: 6, text: "Olá Carlópolis", words: [{ text: "Olá", start: 1, end: 3 }, { text: "Carlópolis", start: 3, end: 6 }] },
      { start: 11, end: 17, text: "Vídeo profissional", words: [{ text: "Vídeo", start: 11, end: 14 }, { text: "profissional", start: 14, end: 17 }] },
      { start: 23, end: 28, text: "Confira agora", words: [{ text: "Confira", start: 23, end: 25.5 }, { text: "agora", start: 25.5, end: 28 }] }
    ] };
    await fs.writeFile(captions, buildAssCaptions(transcript, { format: "9:16", mode: "dynamic", position: "bottom", color: "#FFFFFF", highlightColor: "#FFBB2D" }));
    const audio = generatedAudioPaths(root);
    await generateLibraryMusic("corporate", 30, audio.music);
    const effects = await generateTransitionSoundtrack("subtle", plan, audio.effects);

    const previewDir = path.join(root, "preview");
    const finalDir = path.join(root, "final");
    const editedDir = path.join(root, "edited");
    await Promise.all([previewDir, finalDir, editedDir].map((folder) => fs.mkdir(folder)));
    const preview = await renderPlan({ plan: structuredClone(plan), sources: analyzed, outputDir: previewDir, logoPath: logo, musicPath: audio.music, soundEffectsPath: effects, captionsPath: captions, renderProfile: "preview" });
    const final = await renderPlan({ plan: structuredClone(plan), sources: analyzed, outputDir: finalDir, logoPath: logo, musicPath: audio.music, soundEffectsPath: effects, captionsPath: captions, renderProfile: "final" });
    const previewMeta = await probeMedia(preview.outputPath, "video/mp4");
    const finalMeta = await probeMedia(final.outputPath, "video/mp4");
    assert.deepEqual({ width: previewMeta.width, height: previewMeta.height }, { width: 360, height: 640 });
    assert.deepEqual({ width: finalMeta.width, height: finalMeta.height }, { width: 1080, height: 1920 });
    assert.ok(Math.abs(previewMeta.duration - 30) < 0.35);
    assert.ok(Math.abs(finalMeta.duration - 30) < 0.35);
    assert.equal(previewMeta.hasAudio, true);
    assert.equal(finalMeta.hasAudio, true);
    assert.deepEqual(preview.plan.scenes, final.plan.scenes);
    assert.deepEqual(preview.plan.textLayers, final.plan.textLayers);
    assert.equal(final.plan.music.duckDuringSpeech, true);

    const editedPlan = structuredClone(plan);
    editedPlan.text.title = "Título alterado na nova versão";
    editedPlan.textLayers = editedPlan.textLayers.map((layer) => layer.type === "title" ? { ...layer, value: editedPlan.text.title } : layer);
    const edited = await renderPlan({ plan: editedPlan, sources: analyzed, outputDir: editedDir, logoPath: logo, musicPath: audio.music, soundEffectsPath: effects, captionsPath: captions, renderProfile: "preview" });
    assert.notEqual(await digest(preview.outputPath), await digest(edited.outputPath));
    assert.equal(edited.plan.text.title, "Título alterado na nova versão");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
