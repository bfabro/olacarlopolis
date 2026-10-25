import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeStudioProject } from "../../shared/studio-contracts.mjs";
import { prepareVisualEditorPlan } from "../src/editor-plan.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { buildSegmentArgs, buildVisualEffectFilter, renderPlan } from "../src/renderer.mjs";
import { probeMedia } from "../src/analyzer.mjs";
import { runProcess } from "../src/process-utils.mjs";

const integrationEnabled = process.env.STUDIO_INTEGRATION === "1";
const sources = [{
  id: "photo", name: "fachada.png", order: 0, contentType: "image/png",
  metadata: { duration: 0, hasVideo: true, hasAudio: false, orientation: "portrait" },
  technical: { analysisMethod: "still-image", sceneTimes: [0], silences: [], qualityWindows: [{ start: 0, end: 10, score: 0.9, flags: [] }], waveform: { available: false, samples: [] } }
}];

test("v47 preserva o acabamento escolhido na montagem e na reedição", () => {
  const project = normalizeStudioProject({ style: "reels", format: "9:16", duration: 6, transition: "auto", effectsProfile: "cinematic", editing: {} });
  const plan = createDeterministicPlan(project, sources);
  assert.equal(plan.effectsProfile, "cinematic");
  assert.ok(plan.scenes.every((scene) => scene.visualEffect === "cinematic"));
  assert.ok(plan.scenes.slice(1).every((scene) => ["fadeblack", "dissolve", "fade"].includes(scene.transition)));
  const edited = prepareVisualEditorPlan({ ...plan, effectsProfile: "dynamic" }, plan, sources);
  assert.equal(edited.effectsProfile, "dynamic");
  assert.ok(edited.scenes.every((scene) => scene.visualEffect === "dynamic"));
});

test("v47 gera filtros reais e seguros para cada perfil visual", () => {
  assert.equal(buildVisualEffectFilter({ visualEffect: "natural" }), "");
  assert.match(buildVisualEffectFilter({ visualEffect: "professional" }), /unsharp/);
  assert.match(buildVisualEffectFilter({ visualEffect: "cinematic" }), /vignette/);
  assert.match(buildVisualEffectFilter({ visualEffect: "dynamic" }), /saturation=1\.15/);
  const args = buildSegmentArgs({ duration: 2, visualEffect: "cinematic", photoMotion: {} }, { ...sources[0], localPath: "/tmp/photo.png" }, "/tmp/out.mp4", "9:16");
  assert.match(args[args.indexOf("-vf") + 1], /zoompan.*vignette/s);
});

test("v47 renderiza o acabamento cinematográfico em um MP4 válido", { skip: !integrationEnabled, timeout: 120000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-v47-effects-"));
  try {
    const imagePath = path.join(root, "photo.png");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc2=s=720x1280:d=1", "-frames:v", "1", imagePath]);
    const source = { ...sources[0], localPath: imagePath };
    const project = normalizeStudioProject({ style: "reels", format: "9:16", duration: 2, transition: "hardcut", effectsProfile: "cinematic", editing: {} });
    const plan = createDeterministicPlan(project, [source]);
    const rendered = await renderPlan({ plan, sources: [source], outputDir: root, renderProfile: "preview" });
    const metadata = await probeMedia(rendered.outputPath, "video/mp4");
    assert.equal(metadata.hasVideo, true);
    assert.ok(metadata.duration >= 1.8);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
