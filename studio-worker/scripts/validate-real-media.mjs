import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeSources, probeMedia, summarizeCalibration } from "../src/analyzer.mjs";
import { createDeterministicPlan } from "../src/planner.mjs";
import { renderPlan } from "../src/renderer.mjs";
import { generateLibraryMusic, generateTransitionSoundtrack, generatedAudioPaths } from "../src/sound-library.mjs";

const mediaDirectory = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Informe o diretório com vídeos reais para validação.");
const entries = (await fs.readdir(mediaDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(mp4|mov|m4v|webm)$/i.test(entry.name))
  .slice(0, 3);
if (!entries.length) throw new Error("Nenhum vídeo compatível foi encontrado para validação.");

const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-real-media-"));
try {
  const sources = entries.map((entry, order) => ({ id: `real-${order + 1}`, order, name: entry.name, contentType: entry.name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4", localPath: path.join(mediaDirectory, entry.name) }));
  const analyzed = await analyzeSources(sources, (done, total) => process.stderr.write(`Analisando ${done}/${total}\n`));
  const project = { style: "reels", format: "9:16", duration: 15, transition: "fade", transitionDuration: 0.25, libraryMusic: "corporate", transitionSound: "subtle", editing: { rhythm: "dynamic", syncToMusic: false, prioritizeTechnicalQuality: true }, audio: { musicVolume: 0.18, voiceVolume: 1, fadeSeconds: 0.6 } };
  const plan = createDeterministicPlan(project, analyzed);
  const audio = generatedAudioPaths(root);
  await generateLibraryMusic(project.libraryMusic, plan.duration, audio.music);
  const effects = await generateTransitionSoundtrack(project.transitionSound, plan, audio.effects);
  const rendered = await renderPlan({ plan, sources: analyzed, outputDir: root, musicPath: audio.music, soundEffectsPath: effects, renderProfile: "preview", progress: async (done, total) => process.stderr.write(`Renderizando ${done}/${total}\n`) });
  const output = await probeMedia(rendered.outputPath, "video/mp4");
  const stats = await fs.stat(rendered.outputPath);
  process.stdout.write(`${JSON.stringify({ success: true, calibration: summarizeCalibration(analyzed), render: { ...output, bytes: stats.size, scenes: plan.scenes.length, planner: plan.planner.type, profile: "preview" } }, null, 2)}\n`);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
