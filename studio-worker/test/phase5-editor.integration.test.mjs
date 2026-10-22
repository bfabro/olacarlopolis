import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "../src/process-utils.mjs";
import { probeMedia, analyzeVideo } from "../src/analyzer.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { prepareVisualEditorPlan } from "../src/editor-plan.mjs";
import { renderPlan } from "../src/renderer.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 5 usa o mesmo plano editado na prévia e na exportação final", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase5-"));
  try {
    const sourcePaths = [path.join(root, "blue.mp4"), path.join(root, "yellow.mp4")];
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x0C5F91:s=360x640:d=4:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", sourcePaths[0]]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0xFFBB2D:s=360x640:d=4:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", sourcePaths[1]]);
    const sources = [];
    for (let index = 0; index < sourcePaths.length; index += 1) {
      const metadata = await probeMedia(sourcePaths[index], "video/mp4");
      sources.push({ id: `source-${index + 1}`, order: index, contentType: "video/mp4", localPath: sourcePaths[index], metadata, technical: await analyzeVideo(sourcePaths[index], metadata) });
    }
    const base = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, title: "Título antigo" }, sources);
    const edited = prepareVisualEditorPlan({ ...base, text: { title: "Título alterado", subtitle: "Prévia fiel", callToAction: "Confira agora" }, scenes: [{ ...base.scenes[1], duration: 2 }, { ...base.scenes[0], duration: 2, transition: "dissolve", transitionDuration: 0.3 }] }, base, sources);
    const previewDir = path.join(root, "preview");
    const finalDir = path.join(root, "final");
    await fs.mkdir(previewDir);
    await fs.mkdir(finalDir);
    const preview = await renderPlan({ plan: structuredClone(edited), sources, outputDir: previewDir, renderProfile: "preview" });
    const final = await renderPlan({ plan: structuredClone(edited), sources, outputDir: finalDir, renderProfile: "final" });
    const previewMeta = await probeMedia(preview.outputPath, "video/mp4");
    const finalMeta = await probeMedia(final.outputPath, "video/mp4");
    assert.deepEqual({ width: previewMeta.width, height: previewMeta.height }, { width: 360, height: 640 });
    assert.deepEqual({ width: finalMeta.width, height: finalMeta.height }, { width: 1080, height: 1920 });
    assert.ok(Math.abs(previewMeta.duration - edited.duration) < 0.35);
    assert.ok(Math.abs(finalMeta.duration - edited.duration) < 0.35);
    assert.equal(preview.plan.text.title, "Título alterado");
    assert.equal(final.plan.scenes[1].transition, "dissolve");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
