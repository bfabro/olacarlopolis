import fs from "node:fs/promises";
import path from "node:path";
import { studioOutputDimensions } from "../../shared/studio-contracts.mjs";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";

const seconds = (value) => Math.max(0.05, Number(value || 0)).toFixed(3);

function drawTextEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%").replace(/\n/g, " ");
}

function filterPathEscape(value) {
  return String(value || "").replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export function buildSegmentArgs(scene, source, outputPath, format) {
  const { width, height } = studioOutputDimensions(format);
  const image = source.contentType.startsWith("image/");
  const args = ["-y"];
  if (image) args.push("-loop", "1", "-t", seconds(scene.duration), "-i", source.localPath, "-f", "lavfi", "-t", seconds(scene.duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  else {
    args.push("-ss", seconds(scene.start), "-t", seconds(scene.duration), "-i", source.localPath);
    if (!source.metadata.hasAudio) args.push("-f", "lavfi", "-t", seconds(scene.duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  }
  args.push("-map", "0:v:0", "-map", source.metadata.hasAudio && !image ? "0:a:0" : "1:a:0");
  args.push("-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30,setsar=1,format=yuv420p`);
  if (source.metadata.hasAudio && !image) args.push("-af", "loudnorm=I=-16:LRA=11:TP=-1.5,aresample=48000");
  args.push("-t", seconds(scene.duration), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", outputPath);
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

export function buildPairTransitionArgs({ leftPath, rightPath, outputPath, leftDuration, rightDuration, transition = "fade", transitionDuration = 0.35 }) {
  const safeDuration = Math.min(Number(transitionDuration || 0.35), Number(leftDuration) / 2, Number(rightDuration) / 2);
  const offset = Math.max(0, Number(leftDuration) - safeDuration);
  const graph = `[0:v][1:v]xfade=transition=${transition}:duration=${seconds(safeDuration)}:offset=${seconds(offset)}[vout];[0:a][1:a]acrossfade=d=${seconds(safeDuration)}:c1=tri:c2=tri[aout]`;
  return {
    args: ["-y", "-i", leftPath, "-i", rightPath, "-filter_complex_threads", "1", "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath],
    outputDuration: Number(leftDuration) + Number(rightDuration) - safeDuration
  };
}

export function buildBrandingArgs({ inputPath, outputPath, duration, format, plan, logoPath = "", musicPath = "", captionsPath = "" }) {
  const { width } = studioOutputDimensions(format);
  const args = ["-y", "-i", inputPath];
  let nextInput = 1;
  let logoIndex = -1;
  let musicIndex = -1;
  if (logoPath) { logoIndex = nextInput++; args.push("-loop", "1", "-i", logoPath); }
  if (musicPath) { musicIndex = nextInput++; args.push("-stream_loop", "-1", "-i", musicPath); }
  const filters = [];
  let video = "0:v";
  if (logoIndex >= 0) {
    filters.push(`[${logoIndex}:v]scale=${Math.round(width * 0.18)}:-1[logo]`);
    filters.push(`[${video}][logo]overlay=W-w-${Math.round(width * 0.045)}:${Math.round(width * 0.045)}:format=auto[vlogo]`);
    video = "vlogo";
  }
  if (captionsPath) {
    filters.push(`[${video}]subtitles='${filterPathEscape(captionsPath)}':force_style='FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00122435,BorderStyle=1,Outline=2,Alignment=2,MarginV=70'[vcap]`);
    video = "vcap";
  }
  const textBlocks = [
    { value: plan.text?.title, size: Math.round(width * 0.048), y: "h*0.10", enable: "between(t,0,4.8)" },
    { value: plan.text?.subtitle, size: Math.round(width * 0.026), y: "h*0.17", enable: "between(t,0.4,5.5)" },
    { value: plan.text?.callToAction, size: Math.round(width * 0.038), y: "h*0.82", enable: `between(t,${Math.max(0, duration - 4.5)},${duration})` }
  ].filter((item) => item.value);
  textBlocks.forEach((item, index) => {
    const out = index === textBlocks.length - 1 ? "vout" : `vtext${index}`;
    filters.push(`[${video}]drawtext=fontfile='${filterPathEscape(workerConfig.fontFile)}':text='${drawTextEscape(item.value)}':fontcolor=white:fontsize=${item.size}:borderw=3:bordercolor=0x092B45@0.92:box=1:boxcolor=0x092B45@0.58:boxborderw=18:x=(w-text_w)/2:y=${item.y}:enable='${item.enable}'[${out}]`);
    video = out;
  });
  if (!textBlocks.length) filters.push(`[${video}]null[vout]`);
  if (musicIndex >= 0) {
    filters.push(`[${musicIndex}:a]volume=${Number(plan.music?.volume || 0.18).toFixed(2)},atrim=duration=${seconds(duration)},asetpts=PTS-STARTPTS[music]`);
    filters.push("[music][0:a]sidechaincompress=threshold=0.035:ratio=10:attack=20:release=450[ducked]");
    filters.push("[0:a][ducked]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:LRA=9:TP=-1.5[aout]");
  } else filters.push("[0:a]anull[aout]");
  args.push("-filter_complex", filters.join(";"), "-map", "[vout]", "-map", "[aout]", "-t", seconds(duration), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath);
  return args;
}

export async function renderPlan({ plan, sources, outputDir, logoPath = "", musicPath = "", captionsPath = "", progress = async () => {}, signal }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const segmentPaths = [];
  for (let index = 0; index < plan.scenes.length; index += 1) {
    const scene = plan.scenes[index];
    const source = sourceById.get(scene.sourceId);
    if (!source) throw new Error(`Origem ${scene.sourceId} nao encontrada para a cena ${scene.id}.`);
    const segmentPath = path.join(outputDir, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
    await runProcess(workerConfig.ffmpegPath, buildSegmentArgs(scene, source, segmentPath, plan.format), { signal });
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
        transitionDuration: plan.scenes[index].transitionDuration || 0.35
      });
      await runProcess(workerConfig.ffmpegPath, pair.args, { signal });
      if (currentPath.includes(`${path.sep}transition-`)) await fs.rm(currentPath, { force: true });
      currentPath = outputPath;
      currentDuration = pair.outputDuration;
      await progress("transitions", index, segmentPaths.length - 1);
    }
  }
  const outputPath = path.join(outputDir, "ola-studio-final.mp4");
  await runProcess(workerConfig.ffmpegPath, buildBrandingArgs({ inputPath: compositionPath, outputPath, duration: plan.duration, format: plan.format, plan, logoPath, musicPath, captionsPath }), { signal });
  await progress("branding", 1, 1);
  return outputPath;
}
