import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDeterministicPlan } from "../studio-worker/src/planner.mjs";
import { buildBrandingArgs, buildNarrationTimelineArgs, buildPairTransitionArgs, buildSegmentArgs, buildTextLayerFilters, buildTransitionGraph, narrationCaptionSegments, renderDimensions, renderExportSettings, scheduleNarrationSegments, splitNarrationScript, withoutNarrationDuplicateLayers } from "../studio-worker/src/renderer.mjs";
import { prepareVisualEditorPlan } from "../studio-worker/src/editor-plan.mjs";
import { runProcess, withTimeout } from "../studio-worker/src/process-utils.mjs";
import { buildAssCaptions, uniqueCaptionSegments } from "../studio-worker/src/captions.mjs";
import { parseWhisperJson, prepareReviewedTranscription } from "../studio-worker/src/transcription.mjs";
import { buildQualityWindows, buildShakeIntervals, deriveQualityThresholds, parseCameraMotionTransforms, parseIntervals, parseSignalFrames, summarizeCalibration } from "../studio-worker/src/analyzer.mjs";
import { detectRhythmFromPcm } from "../studio-worker/src/rhythm.mjs";
import { OpenAISemanticPlanner, buildSemanticCandidates, estimateSemanticUsageCost, markSemanticFallback, prepareSemanticEvidence, semanticFailureInfo } from "../studio-worker/src/ai-planner.mjs";
import { composePlanWaveform, waveformFromPcm } from "../studio-worker/src/audio-waveform.mjs";
import { deleteStudioProjectAssets, studioProjectPrefixes } from "../studio-worker/src/cleanup.mjs";
import { libraryMusicDefinition, transitionEffectEvents } from "../studio-worker/src/sound-library.mjs";
import { OpenAISpeechProvider } from "../studio-worker/src/tts-provider.mjs";

const video = { id: "video-1", order: 0, contentType: "video/mp4", localPath: "/tmp/video.mp4", metadata: { duration: 20, hasAudio: true }, technical: { sceneTimes: [0, 4, 9, 14], silences: [{ start: 6, end: 7 }] } };
const image = { id: "image-1", order: 1, contentType: "image/jpeg", localPath: "/tmp/foto.jpg", metadata: { duration: 0, hasAudio: false }, technical: { sceneTimes: [0], silences: [] } };

test("exclusão manual fica restrita às cinco pastas do projeto confirmado", async () => {
  const prefixes = studioProjectPrefixes("usuario_1", "projeto-1");
  assert.deepEqual(prefixes, ["originals", "logos", "music", "plans", "renders"].map((folder) => `studio/usuario_1/${folder}/projeto-1/`));
  assert.throws(() => studioProjectPrefixes("usuario_1", "../outro"), /inválido/);
  const deleted = [];
  const bucket = { getFiles: async ({ prefix }) => [[{ delete: async (options) => deleted.push({ prefix, options }) }]] };
  const result = await deleteStudioProjectAssets(bucket, "usuario_1", "projeto-1");
  assert.equal(result.deletedFiles, 5);
  assert.deepEqual(deleted.map((item) => item.prefix), prefixes);
  assert.ok(deleted.every((item) => item.options.ignoreNotFound === true));
});

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

test("análise técnica mede exposição, movimento, nitidez e intervalos problemáticos", () => {
  const log = "frame:0 pts:0 pts_time:0\nlavfi.signalstats.YAVG=12\nlavfi.signalstats.YDIF=0\nlavfi.blur=18.5\nframe:1 pts:1 pts_time:1\nlavfi.signalstats.YAVG=122\nlavfi.signalstats.YDIF=18\nlavfi.blur=4.2\n[blackdetect] black_start:0 black_end:0.8 black_duration:0.8\n[freezedetect] freeze_start:0 freeze_end:0.9 freeze_duration:0.9";
  const frames = parseSignalFrames(log);
  const dark = parseIntervals(log, "black");
  const frozen = parseIntervals(log, "freeze");
  const windows = buildQualityWindows(frames, 2, { black: dark, freeze: frozen });
  assert.equal(frames.length, 2);
  assert.ok(windows[0].flags.includes("dark"));
  assert.ok(windows[0].flags.includes("frozen"));
  assert.ok(windows[0].flags.includes("blurred"));
  assert.ok(windows[1].score > windows[0].score);
});

test("análise de estabilidade transforma vetores reais em intervalos de tremor", () => {
  const transforms = "Frame 1 (List 0 [])\nFrame 2 (List 4 [(LM 0 0 1 1 16 0.5 0),(LM 0 0 2 2 16 0.5 0),(LM 1 0 3 3 16 0.5 0),(LM 0 1 4 4 16 0.5 0)])\nFrame 3 (List 4 [(LM 12 -10 1 1 16 0.5 0),(LM 11 -10 2 2 16 0.5 0),(LM 13 -9 3 3 16 0.5 0),(LM 12 -11 4 4 16 0.5 0)])\nFrame 4 (List 4 [(LM -10 11 1 1 16 0.5 0),(LM -11 12 2 2 16 0.5 0),(LM -9 11 3 3 16 0.5 0),(LM -10 10 4 4 16 0.5 0)])";
  const frames = parseCameraMotionTransforms(transforms, 4);
  const intervals = buildShakeIntervals(frames, 2);
  assert.equal(frames.length, 3);
  assert.ok(frames.at(-1).jitter > 20);
  assert.deepEqual(intervals.map(({ start, end }) => ({ start, end })), [{ start: 0, end: 1 }]);
});

test("limiares de qualidade se adaptam sem sair das faixas seguras", () => {
  const frames = [
    { brightness: 0.02, motion: 0.001, blur: 7 },
    { brightness: 0.08, motion: 0.004, blur: 10 },
    { brightness: 0.12, motion: 0.01, blur: 12 },
    { brightness: 0.2, motion: 0.04, blur: 15 },
    { brightness: 0.3, motion: 0.12, blur: 18 },
    { brightness: 0.5, motion: 0.2, blur: 24 }
  ];
  const thresholds = deriveQualityThresholds(frames);
  assert.ok(thresholds.darkBrightness >= 0.08 && thresholds.darkBrightness <= 0.15);
  assert.ok(thresholds.blur >= 10 && thresholds.blur <= 18);
  assert.ok(thresholds.highMotion >= 0.12 && thresholds.highMotion <= 0.22);
  const report = summarizeCalibration([{ name: "a.mp4", contentType: "video/mp4", metadata: { hasVideo: true, duration: 3 }, technical: { qualityThresholds: thresholds, qualityWindows: [] } }]);
  assert.equal(report.filesAnalyzed, 1);
  assert.ok(report.recommendedThresholds.blur >= 10);
});

test("biblioteca interna usa presets conhecidos e posiciona efeitos nas transições", () => {
  assert.equal(libraryMusicDefinition("corporate").id, "corporate");
  assert.equal(libraryMusicDefinition("externa"), null);
  const events = transitionEffectEvents({ scenes: [{ duration: 4 }, { duration: 5, transition: "fade", transitionDuration: 0.5 }, { duration: 3, transition: "wipeleft", transitionDuration: 0.25 }] });
  assert.deepEqual(events.map((event) => event.time), [3.5, 8.25]);
});

test("estimativa de IA usa somente o consumo retornado pelo provedor", () => {
  assert.equal(estimateSemanticUsageCost(null, { inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.25 }), null);
  assert.equal(estimateSemanticUsageCost({ input_tokens: 1000000, output_tokens: 1000000 }, { inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.25 }), 0.3);
});

test("detector de ritmo encontra pulsos reais no PCM", () => {
  const sampleRate = 8000;
  const seconds = 6;
  const pcm = Buffer.alloc(sampleRate * seconds * 2);
  for (let beat = 0; beat < seconds * 2; beat += 1) {
    const start = Math.round(beat * 0.5 * sampleRate);
    for (let index = 0; index < 320; index += 1) pcm.writeInt16LE(Math.round(Math.sin(index / 5) * 24000), (start + index) * 2);
  }
  const rhythm = detectRhythmFromPcm(pcm, sampleRate, 50);
  assert.equal(rhythm.available, true);
  assert.ok(rhythm.bpm >= 110 && rhythm.bpm <= 130);
  assert.ok(rhythm.beatTimes.length >= 8);
  assert.equal(rhythm.waveform.samples.length, 120);
});

test("forma de onda usa energia PCM real e acompanha a ordem das cenas", () => {
  const pcm = Buffer.alloc(1000);
  for (let index = 0; index < 500; index += 1) pcm.writeInt16LE(index < 250 ? 1000 : 22000, index * 2);
  const samples = waveformFromPcm(pcm, 10);
  assert.equal(samples.length, 10);
  assert.ok(samples.at(-1) > samples[0]);
  const sources = [{ ...video, technical: { ...video.technical, waveform: { available: true, duration: 20, samples: [0.1, 0.9] } } }];
  const composed = composePlanWaveform([{ sourceId: "video-1", start: 0, duration: 5 }, { sourceId: "video-1", start: 15, duration: 5, transitionDuration: 0 }], sources, 10, 10);
  assert.equal(composed.available, true);
  assert.ok(composed.samples.at(-1) > composed.samples[0]);
});

test("planejador prioriza qualidade, registra narrativa e sincroniza apenas cenas sem fala", () => {
  const weak = { ...video, id: "weak", metadata: { ...video.metadata, hasAudio: false }, technical: { ...video.technical, qualityWindows: [{ start: 0, end: 20, score: 0.12, flags: ["dark", "frozen"] }] } };
  const strong = { ...image, id: "strong", technical: { ...image.technical, qualityWindows: [{ start: 0, end: 20, score: 0.95, flags: [] }] } };
  const plan = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, editing: { rhythm: "dynamic", syncToMusic: true } }, [weak, strong], { rhythm: { available: true, bpm: 120, confidence: 0.9, beatTimes: Array.from({ length: 31 }, (_, index) => index * 0.5), method: "test" } });
  assert.equal(plan.planner.version, 2);
  assert.equal(plan.planner.semanticAnalysis, false);
  assert.equal(plan.scenes[0].sourceId, "strong");
  assert.equal(plan.scenes[0].narrativeRole, "opening");
  assert.equal(plan.rhythm.syncEnabled, true);
  assert.ok(plan.scenes.some((scene) => scene.rhythmSynced));
});

test("diretor semântico usa JSON estrito, não expõe chave e produz plano validado", async () => {
  const analyzed = [video, image];
  const basePlan = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15 }, analyzed);
  const candidates = buildSemanticCandidates(analyzed);
  let request;
  const planner = new OpenAISemanticPlanner({
    apiKey: "segredo-do-worker",
    model: "modelo-configurado",
    fetchImpl: async (_url, options) => {
      request = options;
      const scenes = candidates.slice(0, 2).map((candidate, index) => ({ candidateId: candidate.id, narrativeRole: index ? "closing" : "opening", transition: "fade", emphasis: "Escolha baseada nas evidências fornecidas.", onScreenText: index ? "Conheça nosso trabalho" : "Olá Carlópolis" }));
      return { ok: true, status: 200, json: async () => ({ output_text: JSON.stringify({ scenes, narration: { script: "Conheça um trabalho feito com cuidado.", tone: "professional" }, textPreset: "clean", rhythm: "balanced", rationale: "Narrativa baseada somente nos quadros e metadados fornecidos.", confidence: 0.82 }), usage: { input_tokens: 100, output_tokens: 40 } }) };
    }
  });
  const plan = await planner.createPlan({ project: { director: { brief: "Valorizar a empresa" } }, basePlan, evidence: { candidates, frames: [], transcripts: [] }, analyzedSources: analyzed });
  const body = JSON.parse(request.body);
  assert.equal(request.headers.Authorization, "Bearer segredo-do-worker");
  assert.doesNotMatch(request.body, /segredo-do-worker/);
  assert.equal(body.store, false);
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.equal(plan.planner.type, "semantic-ai");
  assert.equal(plan.planner.semanticAnalysis, true);
  assert.equal(plan.aiDirector.applied, true);
  assert.equal(plan.narration.generated, true);
  assert.ok(plan.textLayers.some((layer) => layer.type === "ai_scene_text"));
});

test("diretor sem configuração registra fallback técnico sem fingir IA", () => {
  const basePlan = createDeterministicPlan({ style: "institucional", format: "16:9", duration: 15 }, [video]);
  const fallback = markSemanticFallback(basePlan, "Chave ausente");
  assert.equal(fallback.planner.type, "deterministic-technical");
  assert.equal(fallback.planner.semanticAnalysis, false);
  assert.equal(fallback.planner.fallback, true);
  assert.equal(fallback.aiDirector.applied, false);
});

test("evidências semânticas ignoram somente a mídia cujo quadro não foi gerado", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-evidence-"));
  try {
    const bad = { ...video, id: "bad-video", name: "video-problematico.mp4", localPath: path.join(root, "bad.mp4"), metadata: { ...video.metadata, hasVideo: true }, technical: { ...video.technical, qualityWindows: [{ start: 2, score: 0.9, flags: [] }] } };
    const good = { ...image, id: "good-image", name: "foto-valida.jpg", localPath: path.join(root, "good.jpg"), metadata: { ...image.metadata, hasVideo: true }, technical: { ...image.technical, qualityWindows: [{ start: 0, score: 0.8, flags: [] }] } };
    const calls = [];
    const evidence = await prepareSemanticEvidence([bad, good], root, {
      runProcess: async (_command, args) => {
        calls.push(args);
        const sourcePath = args[args.indexOf("-i") + 1];
        if (sourcePath === good.localPath) await fs.writeFile(args.at(-1), Buffer.alloc(256, 1));
        return { stdout: "", stderr: "" };
      }
    });
    assert.equal(calls.length, 3, "o vídeo inválido deve tentar o ponto escolhido e o início antes de ser ignorado");
    assert.equal(evidence.frames.length, 1);
    assert.equal(evidence.frames[0].sourceId, "good-image");
    assert.equal(evidence.warnings.length, 1);
    assert.equal(evidence.warnings[0].code, "semantic_frame_unavailable");
    assert.match(evidence.warnings[0].message, /video-problematico\.mp4/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("falhas da IA são traduzidas para mensagens seguras e compreensíveis", () => {
  assert.deepEqual(semanticFailureInfo({ status: 401, code: "invalid_api_key" }), { code: "openai_authentication", message: "A chave da IA foi recusada. Verifique se ela está ativa e pertence ao projeto correto." });
  assert.equal(semanticFailureInfo({ status: 429, code: "rate_limit_exceeded" }).code, "openai_limit");
  assert.equal(semanticFailureInfo({ code: "openai_invalid_json" }).code, "openai_invalid_response");
  assert.equal(semanticFailureInfo(new Error("/tmp/caminho-interno/segredo")).message, "A direção por IA não pôde ser concluída. A montagem técnica local continuará normalmente.");
});

test("editor visual valida origens, recalcula duração e preserva o plano renderizável", () => {
  const base = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, title: "Antes" }, [video, image]);
  const edited = prepareVisualEditorPlan({ ...base, text: { title: "Depois", subtitle: "Nova mensagem", callToAction: "Fale conosco" }, textLayers: [...base.textLayers, { id: "../../oferta", type: "custom", value: " Oferta   especial ", start: 1, end: 4, animation: "inválida", position: "fora", align: "fora", font: "externa", sizeScale: 9, color: "red", outlineColor: "#123456", background: false, margin: 999 }], audio: { voiceVolume: 9, musicVolume: -1, fadeSeconds: 99, noiseReduction: true }, music: { duckDuringSpeech: false }, scenes: [base.scenes[1], { ...base.scenes[0], start: 19, duration: 2.6, transition: "dissolve", transitionDuration: 0.4 }] }, base, [video, image]);
  assert.equal(edited.planner.type, "visual-editor");
  assert.equal(edited.scenes[0].id, "scene-1");
  assert.equal(edited.scenes[1].transition, "dissolve");
  assert.equal(edited.duration, Number((edited.scenes[0].duration + 2.6 - 0.4).toFixed(3)));
  assert.equal(edited.scenes[1].start, 17.35);
  assert.deepEqual({ voice: edited.audio.voiceVolume, music: edited.audio.musicVolume, fade: edited.audio.fadeSeconds, noise: edited.audio.noiseReduction, duck: edited.music.duckDuringSpeech }, { voice: 1.6, music: 0, fade: 5, noise: true, duck: false });
  assert.ok(edited.textLayers.some((layer) => layer.type === "title" && layer.value === "Depois"));
  const custom = edited.textLayers.find((layer) => layer.type === "custom");
  assert.deepEqual({ id: custom.id, value: custom.value, animation: custom.animation, position: custom.position, align: custom.align, font: custom.font, size: custom.sizeScale, color: custom.color, outline: custom.outlineColor, background: custom.background, margin: custom.margin }, { id: "oferta", value: "Oferta especial", animation: "fade", position: "center", align: "center", font: "sans", size: 1.8, color: "#FFFFFF", outline: "#123456", background: false, margin: 180 });
  assert.throws(() => prepareVisualEditorPlan({ ...base, scenes: [{ ...base.scenes[0], sourceId: "invasor" }] }, base, [video, image]), /não pertence/);
});

test("editor visual permite desligar a biblioteca sonora sem preservar fonte fantasma", () => {
  const technical = createDeterministicPlan({ style: "reels", format: "9:16", duration: 15, libraryMusic: "corporate", transitionSound: "impact" }, [video, image]);
  const edited = prepareVisualEditorPlan({ ...technical, music: { ...technical.music, libraryTrack: "none" }, soundEffects: { preset: "none" } }, technical, [video, image]);
  assert.equal(edited.music.enabled, false);
  assert.equal(edited.music.source, "none");
  assert.equal(edited.soundEffects.preset, "none");
  assert.equal(edited.soundEffects.source, "none");
});

test("prévia usa resolução reduzida e codificação rápida sem alterar o plano", () => {
  assert.deepEqual(renderDimensions("9:16", "preview"), { width: 360, height: 640 });
  assert.deepEqual(renderDimensions("16:9", "preview"), { width: 640, height: 360 });
  const args = buildSegmentArgs({ start: 0, duration: 3 }, video, "/tmp/preview.mp4", "9:16", {}, "preview");
  assert.ok(args.includes("scale=360:640:force_original_aspect_ratio=increase,crop=360:640,fps=30,setsar=1,format=yuv420p"));
  assert.ok(args.includes("ultrafast"));
  assert.ok(args.includes("28"));
});

test("exportação aplica FPS e bitrate reais do perfil selecionado", () => {
  assert.deepEqual(renderExportSettings({ fps: 60, quality: "high" }), { fps: 60, id: "high", label: "Alta", videoBitrateKbps: 12000, audioBitrateKbps: 192, preset: "medium" });
  const args = buildSegmentArgs({ start: 0, duration: 3 }, video, "/tmp/high.mp4", "9:16", {}, "final", { fps: 60, quality: "high" });
  assert.ok(args.includes("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=60,setsar=1,format=yuv420p"));
  assert.deepEqual(args.slice(args.indexOf("-b:v"), args.indexOf("-b:v") + 8), ["-b:v", "12000k", "-maxrate", "15000k", "-bufsize", "24000k", "-r", "60"]);
  assert.ok(args.includes("192k"));
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

test("composição incremental mantém somente duas cenas por etapa", () => {
  const pair = buildPairTransitionArgs({ leftPath: "/tmp/a.mp4", rightPath: "/tmp/b.mp4", outputPath: "/tmp/out.mp4", leftDuration: 10, rightDuration: 4, transition: "fade", transitionDuration: 0.5 });
  assert.equal(pair.args.filter((value) => value === "-i").length, 2);
  assert.match(pair.args[pair.args.indexOf("-filter_complex") + 1], /xfade=transition=fade/);
  assert.match(pair.args[pair.args.indexOf("-filter_complex") + 1], /acrossfade/);
  assert.equal(pair.outputDuration, 13.5);
});

test("hard cut concatena sem sobreposição e mantém a duração integral", () => {
  const pair = buildPairTransitionArgs({ leftPath: "/tmp/a.mp4", rightPath: "/tmp/b.mp4", outputPath: "/tmp/out.mp4", leftDuration: 4, rightDuration: 3, transition: "hardcut", transitionDuration: 0.5 });
  assert.match(pair.args[pair.args.indexOf("-filter_complex") + 1], /concat=n=2/);
  assert.equal(pair.outputDuration, 7);
});

test("plano profissional cria camadas de texto e respeita transição escolhida", () => {
  const plan = createDeterministicPlan({ style: "comercial", format: "9:16", duration: 30, transition: "wipe", transitionDuration: 0.6, title: "Oferta especial", sceneDescription: "Atendimento completo", offerText: "R$ 99", closingText: "Esperamos você", callToAction: "Fale conosco", textDesign: { animation: "slide_up", color: "#FFBB2D", position: "bottom" } }, [video, image]);
  assert.ok(plan.textLayers.length >= 5);
  assert.ok(plan.scenes.slice(1).every((scene) => scene.transition === "wipeleft"));
  assert.ok(plan.scenes.slice(1).every((scene) => scene.transitionDuration === 0.6));
  assert.equal(plan.logo.start, 25);
});

test("oito animações geram filtros de texto renderizáveis", () => {
  for (const animation of ["fade", "slide_up", "slide_down", "typewriter", "zoom_pop", "soft_bounce", "reveal", "word_by_word"]) {
    const built = buildTextLayerFilters("0:v", { value: "Olá Carlópolis", start: 0, end: 4, animation, color: "#FFFFFF", outlineColor: "#092B45", position: "top", align: "center", sizeScale: 1, background: true }, 1080, 1920, 0);
    assert.ok(built.filters.length >= 1, animation);
    assert.ok(built.filters.every((filter) => filter.includes("drawtext=")), animation);
  }
});

test("branding prepara logo, textos, música com ducking e faststart", () => {
  const args = buildBrandingArgs({ inputPath: "/tmp/base.mp4", outputPath: "/tmp/final.mp4", duration: 15, format: "9:16", logoPath: "/tmp/logo.png", musicPath: "/tmp/music.mp3", captionsPath: "/tmp/captions.ass", plan: { text: { title: "Oferta", callToAction: "Fale conosco" }, music: { volume: 0.2 }, audio: { musicVolume: 0.2, fadeSeconds: 1.2 } } });
  const filters = args[args.indexOf("-filter_complex") + 1];
  assert.match(filters, /overlay=/);
  assert.match(filters, /subtitles=/);
  assert.doesNotMatch(filters, /force_style/);
  assert.match(filters, /drawtext=/);
  assert.match(filters, /loudnorm=I=-20/);
  assert.doesNotMatch(filters, /\[music\]\[0:a\]sidechaincompress/);
  assert.match(filters, /afade=t=in/);
  assert.ok(args.includes("+faststart"));
  const withoutDucking = buildBrandingArgs({ inputPath: "/tmp/base.mp4", outputPath: "/tmp/final.mp4", duration: 15, format: "9:16", musicPath: "/tmp/music.mp3", plan: { textLayers: [], music: { duckDuringSpeech: false }, audio: { musicVolume: 0.2 } } });
  const directMix = withoutDucking[withoutDucking.indexOf("-filter_complex") + 1];
  assert.doesNotMatch(directMix, /sidechaincompress/);
  assert.match(directMix, /\[0:a\]\[music\]amix/);
  const withNarration = buildBrandingArgs({ inputPath: "/tmp/base.mp4", outputPath: "/tmp/final.mp4", duration: 15, format: "9:16", narrationPath: "/tmp/narration.wav", plan: { textLayers: [], narration: { volume: 1 } } });
  const narrationMix = withNarration[withNarration.indexOf("-filter_complex") + 1];
  assert.match(narrationMix, /asplit=2\[narrationside\]\[narrationmix\]/);
  assert.match(narrationMix, /\[duckedcontent\]\[narrationmix\]amix/);
});

test("provedor de voz envia somente o roteiro e salva WAV sem expor a chave", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-tts-"));
  let request;
  try {
    const provider = new OpenAISpeechProvider({ apiKey: "chave-secreta", model: "tts-test", fetchImpl: async (_url, options) => { request = options; return new Response(Buffer.alloc(512, 1), { status: 200, headers: { "content-type": "audio/wav" } }); } });
    const spoken = await provider.synthesize({ script: "Conheça o comércio local.", voice: "cedar", tone: "warm", outputDir: root });
    const body = JSON.parse(request.body);
    assert.equal(request.headers.Authorization, "Bearer chave-secreta");
    assert.doesNotMatch(request.body, /chave-secreta/);
    assert.deepEqual({ model: body.model, voice: body.voice, input: body.input, format: body.response_format }, { model: "tts-test", voice: "cedar", input: "Conheça o comércio local.", format: "wav" });
    assert.equal(spoken.available, true);
    assert.ok((await fs.stat(spoken.localPath)).size > 0);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("narração é dividida, distribuída até o final e preparada em uma timeline única", () => {
  const sentences = splitNarrationScript("A primeira cena apresenta a entrada. Depois mostramos a área externa. Por fim aparece a vista da água.", 5);
  assert.equal(sentences.length, 3);
  const scheduled = scheduleNarrationSegments(sentences.map((text, index) => ({ text, localPath: `/tmp/voz-${index}.wav`, durationSeconds: 3 + index })), 30);
  assert.equal(scheduled[0].start, 0.45);
  assert.ok(scheduled[1].start > 10);
  assert.ok(scheduled[2].start > 24);
  assert.equal(scheduled[2].end, 29.55);
  const args = buildNarrationTimelineArgs(scheduled, "/tmp/timeline.wav", 30);
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.equal(args.filter((item) => item === "-i").length, 4);
  assert.match(graph, /adelay=450\|450/);
  assert.match(graph, /amix=inputs=4:duration=first/);
  assert.match(graph, /atrim=duration=30\.000/);
  const captions = narrationCaptionSegments(scheduled);
  assert.deepEqual(captions[1], { id: "narration-2", start: scheduled[1].start, end: scheduled[1].end, text: sentences[1] });
  assert.equal("words" in captions[1], false);
});

test("parser do Whisper preserva português e timestamps reais por palavra", () => {
  const parsed = parseWhisperJson({ result: { language: "pt" }, transcription: [{ offsets: { from: 500, to: 2100 }, text: " Olá Carlópolis", tokens: [{ text: " Olá", offsets: { from: 500, to: 1100 }, p: 0.92 }, { text: " Carlópolis", offsets: { from: 1100, to: 2100 }, p: 0.88 }] }] });
  assert.equal(parsed.language, "pt");
  assert.equal(parsed.segments[0].start, 0.5);
  assert.equal(parsed.segments[0].words[1].end, 2.1);
  assert.equal(parsed.segments[0].text, "Olá Carlópolis");
});

test("parser do Whisper descarta marcadores de música mesmo quando chegam fragmentados", () => {
  const transcription = ["[", "M", "Ú", "S", "ICA", "DE", "F", "UND", "O", "]"].map((text, index) => ({ offsets: { from: index * 400, to: (index + 1) * 400 }, text, tokens: [{ text, offsets: { from: index * 400, to: (index + 1) * 400 }, p: 0.99 }] }));
  const parsed = parseWhisperJson({ result: { language: "pt" }, transcription });
  assert.deepEqual(parsed.segments, []);
});

test("legendas ASS oferecem modo tradicional e destaque dinâmico", () => {
  const transcription = { segments: [{ start: 0.5, end: 2.1, text: "Olá Carlópolis", words: [{ text: "Olá", start: 0.5, end: 1.1 }, { text: "Carlópolis", start: 1.1, end: 2.1 }] }] };
  const traditional = buildAssCaptions(transcription, { format: "9:16", mode: "traditional", position: "bottom" });
  const dynamic = buildAssCaptions(transcription, { format: "9:16", mode: "dynamic", position: "bottom", highlightColor: "#FFBB2D" });
  assert.match(traditional, /PlayResX: 1080/);
  assert.match(traditional, /Olá Carlópolis/);
  assert.match(dynamic, /\\kf60/);
  assert.match(dynamic, /Carlópolis/);
});

test("legendas repetidas e sobrepostas são consolidadas antes da renderização", () => {
  const segments = [
    { start: 1, end: 3, text: "Olá Carlópolis" },
    { start: 1.05, end: 3.2, text: "Olá, Carlópolis!" },
    { start: 4, end: 5, text: "Confira as novidades" }
  ];
  const unique = uniqueCaptionSegments(segments);
  assert.equal(unique.length, 2);
  assert.equal(unique[0].end, 3.2);
  const ass = buildAssCaptions({ segments }, { format: "9:16", mode: "traditional" });
  assert.equal((ass.match(/^Dialogue:/gm) || []).length, 2);
});

test("narração remove textos automáticos de cena para não duplicar a legenda", () => {
  const layers = withoutNarrationDuplicateLayers([
    { type: "title", value: "Título informado pelo usuário" },
    { type: "ai_scene_text", value: "Texto automático repetido" },
    { type: "call_to_action", value: "Acesse agora" }
  ]);
  assert.deepEqual(layers.map((layer) => layer.type), ["title", "call_to_action"]);
});

test("revisão de transcrição preserva tempos e recalcula palavras somente quando o texto muda", () => {
  const reviewed = prepareReviewedTranscription({ provider: "whisper.cpp", segments: [{ id: "caption-1", start: 0.5, end: 2.5, text: "Olá Carlópolis corrigido", words: [{ text: "Olá", start: 0.5, end: 1 }, { text: "Carlópolis", start: 1, end: 2.5 }] }] }, 15);
  assert.equal(reviewed.segments[0].start, 0.5);
  assert.equal(reviewed.segments[0].end, 2.5);
  assert.equal(reviewed.segments[0].words.length, 3);
  assert.equal(reviewed.segments[0].words[0].start, 0.5);
  assert.equal(reviewed.segments[0].words[2].end, 2.5);
  const clamped = prepareReviewedTranscription({ segments: [{ start: 0, end: 1, text: "fora", words: [{ text: "fora", start: 3, end: 4 }] }] }, 2);
  assert.ok(clamped.segments[0].words[0].start < clamped.segments[0].words[0].end);
  assert.equal(clamped.segments[0].words[0].end, 1);
});

test("pausa para revisão preserva a composição como prévia privada", async () => {
  const renderer = await fs.readFile(new URL("../studio-worker/src/renderer.mjs", import.meta.url), "utf8");
  assert.match(renderer, /reviewMediaPath: compositionPath/);
});

test("tratamento de voz aplica redução moderada de ruído quando solicitada", () => {
  const args = buildSegmentArgs({ start: 0, duration: 3 }, video, "/tmp/out.mp4", "9:16", { voiceVolume: 1.2, noiseReduction: true });
  const audioFilter = args[args.indexOf("-af") + 1];
  assert.match(audioFilter, /afftdn/);
  assert.match(audioFilter, /volume=1.20/);
  assert.match(audioFilter, /loudnorm/);
});

test("operações externas travadas são interrompidas para permitir nova tentativa", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, "Leitura de teste"),
    /Leitura de teste excedeu 10 ms/
  );
  assert.equal(await withTimeout(Promise.resolve("ok"), 100, "Leitura de teste"), "ok");
});

test("processo externo é encerrado quando o usuário cancela a criação", async () => {
  const cancellation = new AbortController();
  setTimeout(() => cancellation.abort(), 40);
  await assert.rejects(
    runProcess(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], { signal: cancellation.signal }),
    (error) => error?.code === "studio_cancelled"
  );
});
