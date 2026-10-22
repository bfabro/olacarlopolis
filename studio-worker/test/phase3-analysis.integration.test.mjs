import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "../src/process-utils.mjs";
import { probeMedia, analyzeVideo } from "../src/analyzer.mjs";
import { analyzeMusicRhythm } from "../src/rhythm.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { renderPlan } from "../src/renderer.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 3 mede qualidade, detecta batidas e exporta a montagem técnica", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase3-"));
  try {
    const weakPath = path.join(root, "weak.mp4");
    const strongPath = path.join(root, "strong.mp4");
    const musicPath = path.join(root, "music.wav");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=black:s=360x640:d=4:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", weakPath]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc2=s=360x640:d=4:r=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", strongPath]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "aevalsrc=if(lt(mod(t\\,0.5)\\,0.06)\\,0.8*sin(2*PI*700*t)\\,0):s=8000:d=8", musicPath]);
    const makeSource = async (id, localPath, order) => {
      const contentType = "video/mp4";
      const metadata = await probeMedia(localPath, contentType);
      return { id, localPath, order, contentType, metadata, technical: await analyzeVideo(localPath, metadata) };
    };
    const weak = await makeSource("weak", weakPath, 0);
    const strong = await makeSource("strong", strongPath, 1);
    const rhythm = await analyzeMusicRhythm(musicPath, root);
    assert.ok(weak.technical.qualityWindows.some((window) => window.flags.includes("dark")));
    assert.ok(strong.technical.qualityWindows.some((window) => window.score > 0.5));
    assert.equal(rhythm.available, true);
    assert.ok(rhythm.bpm >= 110 && rhythm.bpm <= 130);
    const project = { style: "reels", format: "9:16", duration: 7, transition: "hardcut", transitionDuration: 0.2, editing: { rhythm: "dynamic", syncToMusic: true }, audio: { musicVolume: 0.18 }, music: { id: "music" } };
    const plan = createDeterministicPlan(project, [weak, strong], { rhythm });
    assert.equal(plan.scenes[0].sourceId, "strong");
    assert.equal(plan.planner.semanticAnalysis, false);
    assert.ok(plan.scenes.some((scene) => scene.rhythmSynced));
    const rendered = await renderPlan({ plan, sources: [weak, strong], outputDir: root, musicPath });
    const outputMetadata = await probeMedia(rendered.outputPath, "video/mp4");
    assert.ok((await fs.stat(rendered.outputPath)).size > 10000);
    assert.ok(outputMetadata.duration >= 6.5 && outputMetadata.duration <= 7.5);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
