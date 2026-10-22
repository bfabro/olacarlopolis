import test from "node:test";
import assert from "node:assert/strict";
import { createDeterministicPlan } from "../studio-worker/src/planner.mjs";
import { buildBrandingArgs, buildPairTransitionArgs, buildSegmentArgs, buildTextLayerFilters, buildTransitionGraph } from "../studio-worker/src/renderer.mjs";
import { runProcess, withTimeout } from "../studio-worker/src/process-utils.mjs";
import { buildAssCaptions } from "../studio-worker/src/captions.mjs";
import { parseWhisperJson, prepareReviewedTranscription } from "../studio-worker/src/transcription.mjs";
import { buildQualityWindows, parseIntervals, parseSignalFrames } from "../studio-worker/src/analyzer.mjs";
import { detectRhythmFromPcm } from "../studio-worker/src/rhythm.mjs";
import { OpenAISemanticPlanner, buildSemanticCandidates, markSemanticFallback } from "../studio-worker/src/ai-planner.mjs";

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

test("análise técnica mede exposição, movimento e intervalos problemáticos", () => {
  const log = "frame:0 pts:0 pts_time:0\nlavfi.signalstats.YAVG=12\nlavfi.signalstats.YDIF=0\nframe:1 pts:1 pts_time:1\nlavfi.signalstats.YAVG=122\nlavfi.signalstats.YDIF=18\n[blackdetect] black_start:0 black_end:0.8 black_duration:0.8\n[freezedetect] freeze_start:0 freeze_end:0.9 freeze_duration:0.9";
  const frames = parseSignalFrames(log);
  const dark = parseIntervals(log, "black");
  const frozen = parseIntervals(log, "freeze");
  const windows = buildQualityWindows(frames, 2, { black: dark, freeze: frozen });
  assert.equal(frames.length, 2);
  assert.ok(windows[0].flags.includes("dark"));
  assert.ok(windows[0].flags.includes("frozen"));
  assert.ok(windows[1].score > windows[0].score);
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
      const scenes = candidates.slice(0, 2).map((candidate, index) => ({ candidateId: candidate.id, narrativeRole: index ? "closing" : "opening", transition: "fade", emphasis: "Escolha baseada nas evidências fornecidas." }));
      return { ok: true, status: 200, json: async () => ({ output_text: JSON.stringify({ scenes, textPreset: "clean", rhythm: "balanced", rationale: "Narrativa baseada somente nos quadros e metadados fornecidos.", confidence: 0.82 }), usage: { input_tokens: 100, output_tokens: 40 } }) };
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
});

test("diretor sem configuração registra fallback técnico sem fingir IA", () => {
  const basePlan = createDeterministicPlan({ style: "institucional", format: "16:9", duration: 15 }, [video]);
  const fallback = markSemanticFallback(basePlan, "Chave ausente");
  assert.equal(fallback.planner.type, "deterministic-technical");
  assert.equal(fallback.planner.semanticAnalysis, false);
  assert.equal(fallback.planner.fallback, true);
  assert.equal(fallback.aiDirector.applied, false);
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
  assert.match(filters, /sidechaincompress/);
  assert.match(filters, /afade=t=in/);
  assert.ok(args.includes("+faststart"));
});

test("parser do Whisper preserva português e timestamps reais por palavra", () => {
  const parsed = parseWhisperJson({ result: { language: "pt" }, transcription: [{ offsets: { from: 500, to: 2100 }, text: " Olá Carlópolis", tokens: [{ text: " Olá", offsets: { from: 500, to: 1100 }, p: 0.92 }, { text: " Carlópolis", offsets: { from: 1100, to: 2100 }, p: 0.88 }] }] });
  assert.equal(parsed.language, "pt");
  assert.equal(parsed.segments[0].start, 0.5);
  assert.equal(parsed.segments[0].words[1].end, 2.1);
  assert.equal(parsed.segments[0].text, "Olá Carlópolis");
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
