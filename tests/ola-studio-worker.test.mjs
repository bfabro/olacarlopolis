import test from "node:test";
import assert from "node:assert/strict";
import { createDeterministicPlan } from "../studio-worker/src/planner.mjs";
import { buildBrandingArgs, buildSegmentArgs, buildTransitionGraph } from "../studio-worker/src/renderer.mjs";

const video = { id: "video-1", order: 0, contentType: "video/mp4", localPath: "/tmp/video.mp4", metadata: { duration: 20, hasAudio: true }, technical: { sceneTimes: [0, 4, 9, 14], silences: [{ start: 6, end: 7 }] } };
const image = { id: "image-1", order: 1, contentType: "image/jpeg", localPath: "/tmp/foto.jpg", metadata: { duration: 0, hasAudio: false }, technical: { sceneTimes: [0], silences: [] } };

test("planejador técnico declara que não é IA semântica", () => {
  const plan = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, captionsEnabled: false }, [video, image]);
  assert.equal(plan.planner.type, "deterministic-technical");
  assert.equal(plan.planner.semanticAnalysis, false);
  assert.ok(plan.scenes.length >= 2);
  assert.equal(plan.duration, 15);
});

test("estilos geram parâmetros de corte realmente diferentes", () => {
  const institutional = createDeterministicPlan({ style: "institucional", format: "16:9", duration: 30 }, [video, image]);
  const reels = createDeterministicPlan({ style: "reels", format: "9:16", duration: 30 }, [video, image]);
  assert.notEqual(institutional.transition.duration, reels.transition.duration);
  assert.notEqual(institutional.scenes[0].duration, reels.scenes[0].duration);
  assert.ok(reels.scenes.length > institutional.scenes.length);
});

test("FFmpeg recebe escala com crop sem deformação e áudio normalizado", () => {
  const args = buildSegmentArgs({ start: 2, duration: 4 }, video, "/tmp/out.mp4", "9:16");
  assert.ok(args.includes("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p"));
  assert.ok(args.some((value) => value.includes("loudnorm")));
  assert.ok(args.includes("libx264"));
  assert.ok(args.includes("aac"));
});

test("grafo final aplica transição de vídeo e áudio", () => {
  const graph = buildTransitionGraph([{ duration: 4 }, { duration: 4, transition: "fade", transitionDuration: 0.5 }]);
  assert.match(graph.graph, /xfade=transition=fade/);
  assert.match(graph.graph, /acrossfade/);
});

test("branding prepara logo, textos, música com ducking e faststart", () => {
  const args = buildBrandingArgs({ inputPath: "/tmp/base.mp4", outputPath: "/tmp/final.mp4", duration: 15, format: "9:16", logoPath: "/tmp/logo.png", musicPath: "/tmp/music.mp3", plan: { text: { title: "Oferta", callToAction: "Fale conosco" }, music: { volume: 0.2 } } });
  const filters = args[args.indexOf("-filter_complex") + 1];
  assert.match(filters, /overlay=/);
  assert.match(filters, /drawtext=/);
  assert.match(filters, /sidechaincompress/);
  assert.ok(args.includes("+faststart"));
});
