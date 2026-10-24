import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { probeMedia } from "../src/analyzer.mjs";
import { buildBrandingArgs, buildNarrationTimelineArgs, mergeCaptionSegments, narrationCaptionSegments, narrationItemsForPlan, scheduleNarrationSegments, silentNarrationWindows, trimNarrationAudio, withoutDescriptionsOverSpeech } from "../src/renderer.mjs";
import { buildAssCaptions } from "../src/captions.mjs";
import { runProcess } from "../src/process-utils.mjs";

const integration = process.env.STUDIO_INTEGRATION === "1" ? test : test.skip;

test("narração ocupa somente cenas sem fala e sem pessoa", () => {
  const items = [
    { text: "Vista da represa.", durationSeconds: 1.2, preferredStart: 0, preferredEnd: 3.8 },
    { text: "Área externa.", durationSeconds: 1.1, preferredStart: 6, preferredEnd: 10 }
  ];
  const speech = [{ start: 0.2, end: 3.4 }];
  const scheduled = scheduleNarrationSegments(items, 10, { speechSegments: speech });
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].text, "Área externa.");
  assert.ok(scheduled[0].start >= 6);
  assert.deepEqual(silentNarrationWindows(speech, 10).at(-1), { start: 3.58, end: 10 });
});

test("legendas preservam fala real e adicionam somente a narração programada", () => {
  const merged = mergeCaptionSegments([{ id: "fala", start: 1, end: 2, text: "Olá" }], [{ id: "narracao", start: 4, end: 5, text: "Conheça o local" }]);
  assert.deepEqual(merged.map((item) => item.source), ["original-speech", "ai-narration"]);
  const layers = withoutDescriptionsOverSpeech([
    { type: "title", start: 0, end: 5 },
    { type: "description", start: 0.5, end: 2.5 },
    { type: "ai_scene_text", start: 3, end: 5 }
  ], [{ start: 1, end: 2 }]);
  assert.deepEqual(layers.map((item) => item.type), ["title", "ai_scene_text"]);
});

test("roteiro por cena ignora cenas com pessoa ou fala", () => {
  const items = narrationItemsForPlan({ duration: 9, narration: { script: "" }, scenes: [
    { duration: 3, transitionDuration: 0, hasSpeech: true, containsPerson: true, narrationText: "Não narrar." },
    { duration: 3, transitionDuration: 0, containsPerson: false, narrationText: "Ambiente preparado para receber você." },
    { duration: 3, transitionDuration: 0, containsPerson: true, narrationText: "Não narrar também." }
  ] });
  assert.equal(items.length, 1);
  assert.equal(items[0].preferredStart, 3);
  assert.equal(items[0].text, "Ambiente preparado para receber você.");
});

integration("narração acompanha legendas até o encerramento e preserva música de fundo", { timeout: 120000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-narration-"));
  try {
    const base = path.join(root, "base.mp4");
    const music = path.join(root, "music.wav");
    const voiceOne = path.join(root, "voice-1.wav");
    const voiceTwo = path.join(root, "voice-2.wav");
    const timeline = path.join(root, "timeline.wav");
    const captions = path.join(root, "captions.ass");
    const output = path.join(root, "output.mp4");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x092B45:s=360x640:d=12:r=24", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=12", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", base]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=12", music]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=0.6", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=1", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=0.35", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=1", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=0.5", "-filter_complex", "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[a]", "-map", "[a]", voiceOne]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=0.4", "-f", "lavfi", "-i", "sine=frequency=990:sample_rate=48000:duration=2", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=0.7", "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]", "-map", "[a]", voiceTwo]);
    const trimmedOne = await trimNarrationAudio({ localPath: voiceOne, durationSeconds: 3.1 }, root, 0);
    const trimmedTwo = await trimNarrationAudio({ localPath: voiceTwo, durationSeconds: 3.1 }, root, 1);
    assert.ok(trimmedOne.durationSeconds > 2.25 && trimmedOne.durationSeconds < 2.55);
    assert.ok(trimmedTwo.durationSeconds < 2.2);
    const scheduled = scheduleNarrationSegments([
      { ...trimmedOne, text: "Abertura sincronizada." },
      { ...trimmedTwo, text: "Encerramento sincronizado." }
    ], 12);
    await runProcess("ffmpeg", buildNarrationTimelineArgs(scheduled, timeline, 12));
    const captionSegments = narrationCaptionSegments(scheduled);
    assert.equal(captionSegments[0].start, scheduled[0].start);
    assert.equal(captionSegments[0].end, scheduled[0].end);
    assert.equal("words" in captionSegments[0], false);
    await fs.writeFile(captions, buildAssCaptions({ segments: captionSegments }, { format: "9:16", mode: "traditional" }));
    await runProcess("ffmpeg", buildBrandingArgs({ inputPath: base, outputPath: output, duration: 12, format: "9:16", musicPath: music, narrationPath: timeline, captionsPath: captions, renderProfile: "preview", plan: { textLayers: [], audio: { musicVolume: 0.22, fadeSeconds: 0.5 }, music: { enabled: true, duckDuringSpeech: true }, narration: { enabled: true, volume: 1 }, export: { fps: 24, quality: "compact" } } }));
    const metadata = await probeMedia(output, "video/mp4");
    assert.equal(metadata.hasAudio, true);
    assert.ok(Math.abs(metadata.duration - 12) < 0.2);
    assert.ok(scheduled[1].start >= 9.5);
    assert.ok((await fs.stat(output)).size > 10000);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
