import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "../src/process-utils.mjs";
import { probeMedia, analyzeVideo } from "../src/analyzer.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { createSemanticPlanner, prepareSemanticEvidence } from "../src/ai-planner.mjs";
import { renderPlan } from "../src/renderer.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("Fase 4 envia evidências reais, aplica direção semântica estruturada e exporta MP4", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase4-"));
  try {
    const firstPath = path.join(root, "first.mp4");
    const secondPath = path.join(root, "second.mp4");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc2=s=360x640:d=4:r=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", firstPath]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "smptebars=s=360x640:d=4:r=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", secondPath]);

    const makeSource = async (id, localPath, order) => {
      const metadata = await probeMedia(localPath, "video/mp4");
      return { id, localPath, order, contentType: "video/mp4", metadata, technical: await analyzeVideo(localPath, metadata) };
    };
    const sources = [await makeSource("first", firstPath, 0), await makeSource("second", secondPath, 1)];
    const project = {
      style: "reels",
      format: "9:16",
      duration: 7,
      transition: "auto",
      transitionDuration: 0.25,
      director: { mode: "semantic", brief: "Abrir com energia e encerrar de forma clara." },
      editing: { rhythm: "balanced", syncToMusic: false },
      audio: { musicVolume: 0 }
    };
    const basePlan = createDeterministicPlan(project, sources);
    const evidence = await prepareSemanticEvidence(sources, root);
    assert.equal(evidence.frames.length, 2);
    assert.ok(evidence.frames.every((frame) => frame.dataUrl.startsWith("data:image/jpeg;base64,")));

    const direction = {
      scenes: basePlan.scenes.map((_, index) => ({
        candidateId: evidence.candidates[index % evidence.candidates.length].id,
        narrativeRole: index === 0 ? "opening" : index === basePlan.scenes.length - 1 ? "closing" : "development",
        transition: index === 0 ? "fade" : "dissolve",
        emphasis: "Quadro selecionado pela relevância visual observada.",
        onScreenText: index === 0 ? "Olá Carlópolis" : ""
      })),
      narration: { script: "", tone: "professional" },
      textPreset: "clean",
      rhythm: "balanced",
      rationale: "Sequência curta baseada somente nos quadros fornecidos.",
      confidence: 0.84
    };
    let sentBody;
    const planner = createSemanticPlanner({
      apiKey: "test-server-key",
      model: "test-structured-model",
      fetchImpl: async (_url, request) => {
        sentBody = JSON.parse(request.body);
        return new Response(JSON.stringify({ output_text: JSON.stringify(direction), usage: { input_tokens: 321, output_tokens: 98 } }), { status: 200, headers: { "content-type": "application/json" } });
      }
    });
    const plan = await planner.createPlan({ project, basePlan, evidence, analyzedSources: sources });
    assert.equal(sentBody.store, false);
    assert.equal(sentBody.text.format.strict, true);
    assert.ok(sentBody.input[0].content.some((item) => item.type === "input_image"));
    assert.equal(plan.planner.semanticAnalysis, true);
    assert.equal(plan.aiDirector.applied, true);
    assert.equal(plan.aiDirector.visualInputCount, 2);

    const rendered = await renderPlan({ plan, sources, outputDir: root });
    const outputMetadata = await probeMedia(rendered.outputPath, "video/mp4");
    assert.ok((await fs.stat(rendered.outputPath)).size > 10000);
    assert.ok(outputMetadata.duration >= 6.5 && outputMetadata.duration <= 7.5);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
