import fs from "node:fs/promises";
import path from "node:path";
import { STUDIO_EXPORT_FPS, STUDIO_EXPORT_QUALITIES, studioOutputDimensions } from "../../shared/studio-contracts.mjs";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";
import { writeAssCaptions } from "./captions.mjs";
import { wavDurationSeconds } from "./tts-provider.mjs";

const seconds = (value) => Math.max(0.05, Number(value || 0)).toFixed(3);

export function splitNarrationScript(script, maximumSegments = 12) {
  const sentences = String(script || "").replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (sentences.length <= maximumSegments) return sentences;
  const groups = Array.from({ length: maximumSegments }, () => []);
  sentences.forEach((sentence, index) => groups[Math.min(maximumSegments - 1, Math.floor(index * maximumSegments / sentences.length))].push(sentence));
  return groups.map((group) => group.join(" ")).filter(Boolean);
}

export function scheduleNarrationSegments(items, totalDuration) {
  const duration = Math.max(0.5, Number(totalDuration || 0));
  const padding = Math.min(0.45, duration * 0.03);
  if (!items.length) return [];
  if (items.length === 1) return [{ ...items[0], start: padding, end: Math.min(duration, padding + Number(items[0].durationSeconds || 0)) }];
  return items.map((item, index) => {
    const spokenDuration = Math.max(0.1, Number(item.durationSeconds || 0));
    const ideal = index / (items.length - 1) * Math.max(0, duration - spokenDuration - padding);
    const start = index === items.length - 1 ? Math.max(padding, duration - spokenDuration - padding) : Math.max(padding, ideal);
    return { ...item, start: Number(start.toFixed(3)), end: Number(Math.min(duration, start + spokenDuration).toFixed(3)) };
  });
}

export function buildNarrationTimelineArgs(segments, outputPath, duration) {
  const args = ["-y", "-f", "lavfi", "-t", seconds(duration), "-i", "anullsrc=r=48000:cl=stereo"];
  segments.forEach((segment) => args.push("-i", segment.localPath));
  const delayed = segments.map((segment, index) => {
    const delay = Math.max(0, Math.round(Number(segment.start || 0) * 1000));
    return `[${index + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${delay}|${delay}[narration${index + 1}]`;
  });
  const inputs = ["[0:a]", ...segments.map((_, index) => `[narration${index + 1}]`)].join("");
  const graph = `${delayed.join(";")};${inputs}amix=inputs=${segments.length + 1}:duration=first:normalize=0,atrim=duration=${seconds(duration)}[aout]`;
  return [...args, "-filter_complex", graph, "-map", "[aout]", "-c:a", "pcm_s16le", outputPath];
}

export function narrationCaptionSegments(segments) {
  return segments.map((segment, index) => ({
    id: `narration-${index + 1}`,
    start: segment.start,
    end: segment.end,
    text: segment.text
  }));
}

export function withoutNarrationDuplicateLayers(layers = []) {
  return layers.filter((layer) => layer?.type !== "ai_scene_text");
}

export async function trimNarrationAudio(spoken, outputDir, index, signal) {
  const trimmedPath = path.join(outputDir, `ai-narration-${String(index + 1).padStart(2, "0")}-trimmed.wav`);
  await runProcess(workerConfig.ffmpegPath, [
    "-y", "-i", spoken.localPath,
    "-af", "silenceremove=start_periods=1:start_duration=0.02:start_silence=0.04:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_silence=0.08:start_threshold=-50dB,areverse,aresample=48000,aformat=channel_layouts=stereo",
    "-c:a", "pcm_s16le", trimmedPath
  ], { signal });
  const trimmedDuration = wavDurationSeconds(await fs.readFile(trimmedPath));
  if (trimmedDuration < 0.1) throw Object.assign(new Error("A locução gerada não contém fala audível."), { code: "narration_silence_only" });
  return {
    ...spoken,
    localPath: trimmedPath,
    originalDurationSeconds: Number(spoken.durationSeconds || 0),
    durationSeconds: trimmedDuration
  };
}

export function renderDimensions(format, profile = "final") {
  if (profile !== "preview") return studioOutputDimensions(format);
  if (format === "16:9") return { width: 640, height: 360 };
  if (format === "1:1") return { width: 480, height: 480 };
  return { width: 360, height: 640 };
}

export function renderExportSettings(input = {}) {
  const fps = STUDIO_EXPORT_FPS.includes(Number(input.fps)) ? Number(input.fps) : 30;
  const quality = STUDIO_EXPORT_QUALITIES[input.quality] || STUDIO_EXPORT_QUALITIES.balanced;
  return { fps, ...quality };
}

const videoEncoding = (profile = "final", exportOptions = {}) => {
  const settings = renderExportSettings(exportOptions);
  if (profile === "preview") return ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-r", String(settings.fps), "-c:a", "aac", "-b:a", "96k"];
  return ["-c:v", "libx264", "-preset", settings.preset, "-b:v", `${settings.videoBitrateKbps}k`, "-maxrate", `${Math.round(settings.videoBitrateKbps * 1.25)}k`, "-bufsize", `${settings.videoBitrateKbps * 2}k`, "-r", String(settings.fps), "-c:a", "aac", "-b:a", `${settings.audioBitrateKbps}k`];
};

function drawTextEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%").replace(/\n/g, " ");
}

function filterPathEscape(value) {
  return String(value || "").replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

const ffColor = (value, fallback = "FFFFFF") => `0x${String(value || `#${fallback}`).replace("#", "").slice(0, 6)}`;

function fontPath(font) {
  if (font === "serif") return "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf";
  if (font === "mono") return "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";
  return workerConfig.fontFile;
}

function textGeometry(layer, width, height) {
  const margin = Math.max(24, Number(layer.margin || width * 0.06));
  const safeTop = Math.max(margin, height * 0.08);
  const safeBottom = Math.max(margin, height * 0.1);
  const baseSize = Math.round(width * 0.05 * Number(layer.sizeScale || 1));
  const lengthFactor = Math.min(1, 31 / Math.max(1, String(layer.value || "").length));
  const size = Math.max(Math.round(width * 0.024), Math.round(baseSize * Math.max(0.62, lengthFactor)));
  const x = layer.align === "left" ? `${Math.round(margin)}` : layer.align === "right" ? `w-text_w-${Math.round(margin)}` : "(w-text_w)/2";
  const slotOffset = Number(layer.slot || 0) * Math.round(size * 1.45);
  const y = layer.position === "bottom" ? `h-text_h-${Math.round(safeBottom + slotOffset)}` : layer.position === "center" ? `(h-text_h)/2+${Math.round(slotOffset)}` : `${Math.round(safeTop + slotOffset)}`;
  return { size, x, y };
}

function animationOptions(layer, geometry) {
  const start = Number(layer.start || 0);
  const end = Number(layer.end || start + 3);
  const fade = `if(lt(t,${seconds(start)}),0,if(lt(t,${seconds(start + 0.45)}),(t-${seconds(start)})/0.45,if(lt(t,${seconds(Math.max(start + 0.5, end - 0.45))}),1,max(0,( ${seconds(end)}-t)/0.45))))`;
  const options = { alpha: fade, y: geometry.y, size: String(geometry.size) };
  if (layer.animation === "slide_up") options.y = `${geometry.y}+if(lt(t,${seconds(start + 0.6)}),(1-(t-${seconds(start)})/0.6)*90,0)`;
  if (layer.animation === "slide_down") options.y = `${geometry.y}-if(lt(t,${seconds(start + 0.6)}),(1-(t-${seconds(start)})/0.6)*90,0)`;
  if (layer.animation === "zoom_pop") options.size = `${geometry.size}*(0.72+0.28*min(1,max(0,(t-${seconds(start)})/0.42)))`;
  if (layer.animation === "soft_bounce") options.y = `${geometry.y}-if(lt(t,${seconds(start + 0.9)}),abs(sin((t-${seconds(start)})*9))*38*(1-(t-${seconds(start)})/0.9),0)`;
  if (layer.animation === "reveal") options.alpha = `if(lt(t,${seconds(start)}),0,min(1,max(0,(t-${seconds(start)})/0.65)))*if(lt(t,${seconds(end - 0.35)}),1,max(0,(${seconds(end)}-t)/0.35))`;
  return options;
}

function drawTextFilter(input, output, layer, value, geometry, start, end) {
  const animated = animationOptions({ ...layer, start, end }, geometry);
  const background = layer.background ? ":box=1:boxcolor=0x092B45@0.62:boxborderw=18" : "";
  return `[${input}]drawtext=fontfile='${filterPathEscape(fontPath(layer.font))}':text='${drawTextEscape(value)}':fontcolor=${ffColor(layer.color)}:fontsize='${animated.size}':borderw=3:bordercolor=${ffColor(layer.outlineColor, "092B45")}@0.95:shadowx=2:shadowy=3:shadowcolor=0x000000@0.45${background}:x='${geometry.x}':y='${animated.y}':alpha='${animated.alpha}':enable='between(t,${seconds(start)},${seconds(end)})'[${output}]`;
}

export function buildTextLayerFilters(input, layer, width, height, index) {
  const geometry = textGeometry(layer, width, height);
  const start = Number(layer.start || 0);
  const end = Number(layer.end || start + 3);
  const revealMode = layer.animation === "typewriter" || layer.animation === "word_by_word";
  if (!revealMode) {
    const output = `vtext${index}`;
    return { filters: [drawTextFilter(input, output, layer, layer.value, geometry, start, end)], output };
  }
  const units = layer.animation === "word_by_word" ? String(layer.value).split(/\s+/).filter(Boolean) : [...String(layer.value)];
  const maxSteps = layer.animation === "word_by_word" ? 12 : 24;
  const sampled = units.length <= maxSteps ? units.map((_, unitIndex) => unitIndex + 1) : Array.from({ length: maxSteps }, (_, unitIndex) => Math.ceil((unitIndex + 1) * units.length / maxSteps));
  const revealDuration = Math.min(2.2, Math.max(0.8, (end - start) * 0.42));
  const filters = [];
  let current = input;
  sampled.forEach((amount, step) => {
    const stepStart = start + step * revealDuration / sampled.length;
    const stepEnd = step === sampled.length - 1 ? end : start + (step + 1) * revealDuration / sampled.length;
    const output = `vtext${index}s${step}`;
    const value = layer.animation === "word_by_word" ? units.slice(0, amount).join(" ") : units.slice(0, amount).join("");
    filters.push(drawTextFilter(current, output, { ...layer, animation: "reveal" }, value, geometry, stepStart, stepEnd));
    current = output;
  });
  return { filters, output: current };
}

export function buildSegmentArgs(scene, source, outputPath, format, audioOptions = {}, renderProfile = "final", exportOptions = {}) {
  const { width, height } = renderDimensions(format, renderProfile);
  const { fps } = renderExportSettings(exportOptions);
  const image = source.contentType.startsWith("image/");
  const args = ["-y"];
  if (image) args.push("-loop", "1", "-t", seconds(scene.duration), "-i", source.localPath, "-f", "lavfi", "-t", seconds(scene.duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  else {
    args.push("-ss", seconds(scene.start), "-t", seconds(scene.duration), "-i", source.localPath);
    if (!source.metadata.hasAudio) args.push("-f", "lavfi", "-t", seconds(scene.duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  }
  args.push("-map", "0:v:0", "-map", source.metadata.hasAudio && !image ? "0:a:0" : "1:a:0");
  args.push("-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},setsar=1,format=yuv420p`);
  if (source.metadata.hasAudio && !image) {
    const filters = [];
    if (audioOptions.noiseReduction) filters.push("highpass=f=80", "lowpass=f=12000", "afftdn=nf=-25");
    filters.push(`volume=${Math.min(1.6, Math.max(0.5, Number(audioOptions.voiceVolume || 1))).toFixed(2)}`, "loudnorm=I=-16:LRA=11:TP=-1.5", "aresample=48000");
    args.push("-af", filters.join(","));
  }
  args.push("-t", seconds(scene.duration), ...videoEncoding(renderProfile, exportOptions), "-ar", "48000", "-ac", "2", "-movflags", "+faststart", outputPath);
  return args;
}

export function buildTransitionGraph(scenes) {
  if (scenes.length === 1) return { graph: "[0:v]setpts=PTS-STARTPTS[vout];[0:a]asetpts=PTS-STARTPTS[aout]", video: "[vout]", audio: "[aout]" };
  const filters = [];
  let elapsed = Number(scenes[0].duration);
  let videoLabel = "0:v";
  let audioLabel = "0:a";
  for (let index = 1; index < scenes.length; index += 1) {
    const transitionDuration = Math.min(Number(scenes[index].transitionDuration || 0.35), Number(scenes[index - 1].duration) / 2, Number(scenes[index].duration) / 2);
    const offset = Math.max(0, elapsed - transitionDuration);
    const nextVideo = index === scenes.length - 1 ? "vout" : `v${index}`;
    const nextAudio = index === scenes.length - 1 ? "aout" : `a${index}`;
    filters.push(`[${videoLabel}][${index}:v]xfade=transition=${scenes[index].transition || "fade"}:duration=${seconds(transitionDuration)}:offset=${seconds(offset)}[${nextVideo}]`);
    filters.push(`[${audioLabel}][${index}:a]acrossfade=d=${seconds(transitionDuration)}:c1=tri:c2=tri[${nextAudio}]`);
    elapsed += Number(scenes[index].duration) - transitionDuration;
    videoLabel = nextVideo;
    audioLabel = nextAudio;
  }
  return { graph: filters.join(";"), video: "[vout]", audio: "[aout]" };
}

export function buildPairTransitionArgs({ leftPath, rightPath, outputPath, leftDuration, rightDuration, transition = "fade", transitionDuration = 0.35, width = 1080, height = 1920, renderProfile = "final", exportOptions = {} }) {
  const { fps } = renderExportSettings(exportOptions);
  if (transition === "hardcut") {
    const graph = "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[vout][aout]";
    return { args: ["-y", "-i", leftPath, "-i", rightPath, "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]", ...videoEncoding(renderProfile, exportOptions), "-movflags", "+faststart", outputPath], outputDuration: Number(leftDuration) + Number(rightDuration) };
  }
  const safeDuration = Math.min(Number(transitionDuration || 0.35), Number(leftDuration) / 2, Number(rightDuration) / 2);
  const offset = Math.max(0, Number(leftDuration) - safeDuration);
  const zoomOut = transition === "zoomout" ? `[0:v]settb=AVTB[leftzoom];[1:v]zoompan=z='max(1,1.22-0.22*on/${Math.max(1, Math.round(safeDuration * fps))})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${width}x${height}:fps=${fps},settb=AVTB[rightzoom];` : "";
  const leftVideo = transition === "zoomout" ? "leftzoom" : "0:v";
  const rightVideo = transition === "zoomout" ? "rightzoom" : "1:v";
  const xfade = transition === "zoomout" ? "fade" : transition;
  const graph = `${zoomOut}[${leftVideo}][${rightVideo}]xfade=transition=${xfade}:duration=${seconds(safeDuration)}:offset=${seconds(offset)}[vout];[0:a][1:a]acrossfade=d=${seconds(safeDuration)}:c1=tri:c2=tri[aout]`;
  return {
    args: ["-y", "-i", leftPath, "-i", rightPath, "-filter_complex_threads", "1", "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]", ...videoEncoding(renderProfile, exportOptions), "-movflags", "+faststart", outputPath],
    outputDuration: Number(leftDuration) + Number(rightDuration) - safeDuration
  };
}

export function buildBrandingArgs({ inputPath, outputPath, duration, format, plan, logoPath = "", musicPath = "", soundEffectsPath = "", narrationPath = "", captionsPath = "", renderProfile = "final" }) {
  const { width, height } = renderDimensions(format, renderProfile);
  const args = ["-y", "-i", inputPath];
  let nextInput = 1;
  let logoIndex = -1;
  let musicIndex = -1;
  let soundEffectsIndex = -1;
  let narrationIndex = -1;
  if (logoPath) { logoIndex = nextInput++; args.push("-loop", "1", "-i", logoPath); }
  if (musicPath) { musicIndex = nextInput++; args.push("-stream_loop", "-1", "-i", musicPath); }
  if (soundEffectsPath) { soundEffectsIndex = nextInput++; args.push("-i", soundEffectsPath); }
  if (narrationPath) { narrationIndex = nextInput++; args.push("-i", narrationPath); }
  const filters = [];
  let video = "0:v";
  if (logoIndex >= 0) {
    const logoSize = Number(plan.logo?.size || 0.2);
    const logoStart = Number(plan.logo?.start ?? Math.max(0, duration - 5));
    const logoEnd = Number(plan.logo?.end ?? duration);
    filters.push(`[${logoIndex}:v]scale=${Math.round(width * logoSize)}:-1[logo]`);
    filters.push(`[${video}][logo]overlay=(W-w)/2:(H-h)/2:format=auto:enable='between(t,${seconds(logoStart)},${seconds(logoEnd)})'[vlogo]`);
    video = "vlogo";
  }
  if (captionsPath) {
    filters.push(`[${video}]subtitles='${filterPathEscape(captionsPath)}'[vcap]`);
    video = "vcap";
  }
  const legacyLayers = [
    { type: "title", value: plan.text?.title, start: 0, end: 4.8, position: "top", sizeScale: 1.2 },
    { type: "subtitle", value: plan.text?.subtitle, start: 0.4, end: 5.5, position: "top", slot: 1, sizeScale: 0.8 },
    { type: "call_to_action", value: plan.text?.callToAction, start: Math.max(0, duration - 4.5), end: duration, position: "bottom", sizeScale: 1 }
  ];
  const textLayers = (Array.isArray(plan.textLayers) ? plan.textLayers : legacyLayers).filter((item) => item?.value);
  textLayers.forEach((layer, index) => {
    const built = buildTextLayerFilters(video, { ...plan.textDesign, ...layer }, width, height, index);
    filters.push(...built.filters);
    video = built.output;
  });
  filters.push(`[${video}]null[vout]`);
  let mixedAudio = "baseaudio";
  if (musicIndex >= 0) {
    const fadeSeconds = Math.min(Math.max(0, Number(plan.audio?.fadeSeconds ?? 1.2)), Number(duration) / 3);
    const fadeOutStart = Math.max(0, Number(duration) - fadeSeconds);
    const fades = fadeSeconds > 0 ? `,afade=t=in:st=0:d=${seconds(fadeSeconds)},afade=t=out:st=${seconds(fadeOutStart)}:d=${seconds(fadeSeconds)}` : "";
    filters.push(`[${musicIndex}:a]loudnorm=I=-20:LRA=11:TP=-2,volume=${Number(plan.audio?.musicVolume ?? plan.music?.volume ?? 0.18).toFixed(2)}${fades},atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS[music]`);
    filters.push("[0:a][music]amix=inputs=2:duration=first:normalize=0[baseaudio]");
  } else filters.push("[0:a]anull[baseaudio]");
  if (soundEffectsIndex >= 0) {
    filters.push(`[${soundEffectsIndex}:a]atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS[sfx]`);
    filters.push(`[${mixedAudio}][sfx]amix=inputs=2:duration=first:normalize=0[contentaudio]`);
  } else filters.push(`[${mixedAudio}]anull[contentaudio]`);
  if (narrationIndex >= 0) {
    filters.push(`[${narrationIndex}:a]volume=${Number(plan.narration?.volume || 1).toFixed(2)},atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS,asplit=2[narrationside][narrationmix]`);
    filters.push("[contentaudio][narrationside]sidechaincompress=threshold=0.025:ratio=12:attack=15:release=500[duckedcontent]");
    filters.push("[duckedcontent][narrationmix]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:LRA=9:TP=-1.5[aout]");
  } else filters.push("[contentaudio]loudnorm=I=-14:LRA=9:TP=-1.5[aout]");
  args.push("-filter_complex", filters.join(";"), "-map", "[vout]", "-map", "[aout]", "-t", seconds(duration), ...videoEncoding(renderProfile, plan.export), "-movflags", "+faststart", outputPath);
  return args;
}

export async function renderPlan({ plan, sources, outputDir, logoPath = "", musicPath = "", soundEffectsPath = "", narrationPath = "", speechProvider = null, captionsPath = "", transcriptionProvider = null, approvedTranscription = null, pauseForTranscriptReview = false, renderProfile = "final", progress = async () => {}, signal }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const segmentPaths = [];
  for (let index = 0; index < plan.scenes.length; index += 1) {
    const scene = plan.scenes[index];
    const source = sourceById.get(scene.sourceId);
    if (!source) throw new Error(`Origem ${scene.sourceId} nao encontrada para a cena ${scene.id}.`);
    const segmentPath = path.join(outputDir, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
    await runProcess(workerConfig.ffmpegPath, buildSegmentArgs(scene, source, segmentPath, plan.format, plan.audio, renderProfile, plan.export), { signal });
    segmentPaths.push(segmentPath);
    await progress("segments", index + 1, plan.scenes.length);
  }
  const compositionPath = path.join(outputDir, "composition.mp4");
  if (segmentPaths.length === 1) {
    await fs.copyFile(segmentPaths[0], compositionPath);
    await progress("transitions", 1, 1);
  } else {
    let currentPath = segmentPaths[0];
    let currentDuration = Number(plan.scenes[0].duration);
    for (let index = 1; index < segmentPaths.length; index += 1) {
      const outputPath = index === segmentPaths.length - 1 ? compositionPath : path.join(outputDir, `transition-${String(index).padStart(3, "0")}.mp4`);
      const pair = buildPairTransitionArgs({
        leftPath: currentPath,
        rightPath: segmentPaths[index],
        outputPath,
        leftDuration: currentDuration,
        rightDuration: Number(plan.scenes[index].duration),
        transition: plan.scenes[index].transition || "fade",
        transitionDuration: plan.scenes[index].transitionDuration || 0.35,
        ...renderDimensions(plan.format, renderProfile), renderProfile, exportOptions: plan.export
      });
      await runProcess(workerConfig.ffmpegPath, pair.args, { signal });
      if (currentPath.includes(`${path.sep}transition-`)) await fs.rm(currentPath, { force: true });
      currentPath = outputPath;
      currentDuration = pair.outputDuration;
      await progress("transitions", index, segmentPaths.length - 1);
    }
  }
  if (!captionsPath && plan.captions?.requested && (transcriptionProvider || approvedTranscription)) {
    await progress("transcription", 0, 1);
    const transcription = approvedTranscription || await transcriptionProvider.transcribeFile(compositionPath, outputDir, { signal, prompt: plan.captions.prompt });
    plan.captions = { ...plan.captions, ...transcription, enabled: transcription.available === true && transcription.segments.length > 0 };
    if (pauseForTranscriptReview && plan.captions.enabled && !approvedTranscription) {
      await progress("transcription_review", 1, 1);
      return { outputPath: "", plan, reviewRequired: true, transcription };
    }
    if (plan.captions.enabled) captionsPath = await writeAssCaptions(path.join(outputDir, "captions.ass"), transcription, { ...plan.captions, format: plan.format });
    await progress("transcription", 1, 1);
  }
  if (!narrationPath && plan.narration?.enabled && !String(plan.narration?.script || "").trim()) {
    throw Object.assign(new Error("A narração foi solicitada, mas o roteiro de voz está vazio. Revise o roteiro no editor e tente novamente."), { code: "narration_script_required" });
  }
  if (!narrationPath && plan.narration?.enabled && !speechProvider?.enabled) {
    throw Object.assign(new Error("A narração foi solicitada, mas o serviço de voz por IA não está configurado no worker."), { code: "narration_provider_unavailable" });
  }
  if (!narrationPath && plan.narration?.enabled && plan.narration?.script && speechProvider?.enabled) {
    const parts = splitNarrationScript(plan.narration.script, Math.min(12, Math.max(1, plan.scenes.length)));
    await progress("narration", 0, parts.length);
    const spokenParts = [];
    for (let index = 0; index < parts.length; index += 1) {
      const spoken = await speechProvider.synthesize({ script: parts[index], voice: plan.narration.voice, tone: plan.narration.tone, outputDir, fileName: `ai-narration-${String(index + 1).padStart(2, "0")}.wav`, signal });
      if (spoken.available) spokenParts.push({ ...(await trimNarrationAudio(spoken, outputDir, index, signal)), text: parts[index] });
      await progress("narration", index + 1, parts.length);
    }
    if (spokenParts.length) {
      const scheduled = scheduleNarrationSegments(spokenParts, plan.duration);
      narrationPath = path.join(outputDir, "ai-narration-timeline.wav");
      await runProcess(workerConfig.ffmpegPath, buildNarrationTimelineArgs(scheduled, narrationPath, plan.duration), { signal });
      const captionSegments = narrationCaptionSegments(scheduled);
      captionsPath = await writeAssCaptions(path.join(outputDir, "narration-captions.ass"), { segments: captionSegments }, { ...(plan.captions || {}), enabled: true, mode: "traditional", format: plan.format });
      // A legenda da locução já comunica o roteiro. Remover somente os textos
      // automáticos de cena evita duas mensagens geradas pela IA ao mesmo tempo;
      // títulos, ofertas, descrições e chamadas definidos pelo usuário permanecem.
      plan.textLayers = withoutNarrationDuplicateLayers(plan.textLayers || []);
      plan.captions = { ...(plan.captions || {}), enabled: true, mode: "traditional", provider: "openai-tts-timeline", autoNarration: true, segments: captionSegments };
      plan.narration = { ...plan.narration, provider: spokenParts[0].provider, model: spokenParts[0].model, voice: spokenParts[0].voice, characters: spokenParts.reduce((sum, item) => sum + Number(item.characters || 0), 0), durationSeconds: Number(spokenParts.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0).toFixed(3)), timelineDurationSeconds: Number(scheduled.at(-1)?.end || 0), estimatedCostUsd: Number(spokenParts.reduce((sum, item) => sum + Number(item.estimatedCostUsd || 0), 0).toFixed(6)), segments: scheduled.map(({ text, start, end, durationSeconds }) => ({ text, start, end, durationSeconds })), rendered: true };
    }
  }
  const outputPath = path.join(outputDir, "ola-studio-final.mp4");
  await runProcess(workerConfig.ffmpegPath, buildBrandingArgs({ inputPath: compositionPath, outputPath, duration: plan.duration, format: plan.format, plan, logoPath, musicPath, soundEffectsPath, narrationPath, captionsPath, renderProfile }), { signal });
  await progress("branding", 1, 1);
  return { outputPath, plan };
}
