import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderPlan } from "../src/renderer.mjs";
import { prepareReviewedTranscription } from "../src/transcription.mjs";
import { runProcess } from "../src/process-utils.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 2 pausa para revisão e retoma com a legenda corrigida", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-review-"));
  try {
    const image = path.join(root, "source.jpg");
    const firstPass = path.join(root, "first-pass");
    const finalPass = path.join(root, "final-pass");
    await fs.mkdir(firstPass);
    await fs.mkdir(finalPass);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x0C5F91:s=360x640", "-frames:v", "1", "-threads", "1", image]);
    const transcription = { available: true, provider: "test", language: "pt", segments: [{ id: "caption-1", start: 0.2, end: 1.8, text: "Texto reconhecido", words: [{ text: "Texto", start: 0.2, end: 0.9 }, { text: "reconhecido", start: 0.9, end: 1.8 }] }] };
    const plan = { format: "9:16", duration: 2, scenes: [{ id: "scene-1", sourceId: "source-1", start: 0, duration: 2, transition: "fade", transitionDuration: 0.2 }], textLayers: [], captions: { requested: true, mode: "dynamic", position: "bottom", sizeScale: 1, color: "#FFFFFF", highlightColor: "#FFBB2D" }, audio: {} };
    const sources = [{ id: "source-1", localPath: image, contentType: "image/jpeg", metadata: { hasAudio: false } }];
    const paused = await renderPlan({ plan, sources, outputDir: firstPass, pauseForTranscriptReview: true, transcriptionProvider: { transcribeFile: async () => transcription } });
    assert.equal(paused.reviewRequired, true);
    assert.equal(paused.outputPath, "");
    const approved = prepareReviewedTranscription({ ...transcription, segments: [{ ...transcription.segments[0], text: "Texto corrigido" }] }, 2);
    const rendered = await renderPlan({ plan: structuredClone(plan), sources, outputDir: finalPass, approvedTranscription: approved });
    const { stdout } = await runProcess("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", rendered.outputPath]);
    const metadata = JSON.parse(stdout).format;
    assert.ok(Number(metadata.duration) >= 1.9);
    assert.ok(Number(metadata.size) > 10000);
    assert.equal(rendered.plan.captions.segments[0].text, "Texto corrigido");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
