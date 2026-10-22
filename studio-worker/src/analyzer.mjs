import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";
import { analyzeAudioWaveform } from "./audio-waveform.mjs";

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

export async function probeMedia(localPath, contentType = "", signal) {
  const { stdout } = await runProcess(workerConfig.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", localPath], { signal });
  const data = JSON.parse(stdout || "{}");
  const video = (data.streams || []).find((stream) => stream.codec_type === "video");
  const audio = (data.streams || []).find((stream) => stream.codec_type === "audio");
  const duration = Number(data.format?.duration || video?.duration || 0);
  const width = Number(video?.width || 0);
  const height = Number(video?.height || 0);
  const [rateNumerator, rateDenominator] = String(video?.avg_frame_rate || video?.r_frame_rate || "0/1").split("/").map(Number);
  const frameRate = rateDenominator > 0 ? round(rateNumerator / rateDenominator) : 0;
  return { duration: Number.isFinite(duration) ? duration : 0, width, height, frameRate, orientation: width === height ? "square" : width > height ? "landscape" : "portrait", hasVideo: Boolean(video), hasAudio: Boolean(audio), contentType };
}

export function parseSceneTimes(log = "") {
  return [...String(log).matchAll(/pts_time:([0-9.]+)/g)].map((match) => Number(match[1])).filter(Number.isFinite);
}

export function parseSilences(log = "") {
  const starts = [...String(log).matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...String(log).matchAll(/silence_end:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  return starts.map((start, index) => ({ start, end: ends[index] ?? start, duration: Math.max(0, (ends[index] ?? start) - start) }));
}

export function parseIntervals(log = "", prefix = "black") {
  const starts = [...String(log).matchAll(new RegExp(`${prefix}_start:?\\s*([0-9.]+)`, "g"))].map((match) => Number(match[1]));
  const ends = [...String(log).matchAll(new RegExp(`${prefix}_end:?\\s*([0-9.]+)`, "g"))].map((match) => Number(match[1]));
  return starts.map((start, index) => ({ start, end: ends[index] ?? start, duration: Math.max(0, (ends[index] ?? start) - start) }));
}

export function parseSignalFrames(log = "") {
  const frames = [];
  const blocks = String(log).split(/(?=frame:\d+\s+pts:)/g);
  for (const block of blocks) {
    const time = Number(block.match(/pts_time:([0-9.]+)/)?.[1]);
    const yavg = Number(block.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/)?.[1]);
    const ydif = Number(block.match(/lavfi\.signalstats\.YDIF=([0-9.]+)/)?.[1]);
    const blur = Number(block.match(/lavfi\.blur=([0-9.]+)/)?.[1]);
    if (Number.isFinite(time) && Number.isFinite(yavg)) frames.push({ time, brightness: round(yavg / 255), motion: Number.isFinite(ydif) ? round(ydif / 255) : 0, blur: Number.isFinite(blur) ? round(blur) : null });
  }
  return frames;
}

const median = (values) => {
  const ordered = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!ordered.length) return 0;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

export function parseCameraMotionTransforms(content = "", fps = 4) {
  const frames = [];
  let previous = null;
  for (const match of String(content).matchAll(/^Frame\s+(\d+)\s+\(List\s+\d+\s+\[(.*)\]\)$/gm)) {
    const vectors = [...match[2].matchAll(/\(LM\s+(-?\d+)\s+(-?\d+)\s/g)].map((vector) => ({ x: Number(vector[1]), y: Number(vector[2]) }));
    if (vectors.length < 4) continue;
    const x = median(vectors.map((vector) => vector.x));
    const y = median(vectors.map((vector) => vector.y));
    const jitter = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    const frame = { time: round((Number(match[1]) - 1) / fps), x: round(x), y: round(y), jitter: round(jitter), vectors: vectors.length };
    frames.push(frame);
    previous = frame;
  }
  return frames;
}

export function buildShakeIntervals(frames, duration, threshold = 4.5) {
  const seconds = Math.max(1, Math.ceil(Number(duration || 1)));
  const unstable = [];
  for (let second = 0; second < seconds; second += 1) {
    const samples = frames.filter((frame) => frame.time >= second && frame.time < second + 1);
    if (samples.length < 2) continue;
    const average = samples.reduce((sum, frame) => sum + frame.jitter, 0) / samples.length;
    const peak = Math.max(...samples.map((frame) => frame.jitter));
    if (average >= threshold || peak >= threshold * 1.8) unstable.push({ start: second, end: Math.min(seconds, second + 1), intensity: round(Math.max(average, peak / 1.8)) });
  }
  return unstable.reduce((intervals, item) => {
    const previous = intervals.at(-1);
    if (previous?.end === item.start) {
      previous.end = item.end;
      previous.duration = round(previous.end - previous.start);
      previous.intensity = Math.max(previous.intensity, item.intensity);
    } else intervals.push({ ...item, duration: round(item.end - item.start) });
    return intervals;
  }, []);
}

export async function analyzeCameraStability(localPath, metadata, signal) {
  if (!metadata?.hasVideo || metadata.contentType?.startsWith("image/")) return { frames: [], intervals: [], method: "none" };
  const fps = 4;
  const transformPath = path.join(path.dirname(localPath), `.camera-${crypto.randomUUID()}.trf`);
  const filterPath = transformPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  try {
    await runProcess(workerConfig.ffmpegPath, ["-y", "-hide_banner", "-i", localPath, "-vf", `fps=${fps},scale=320:-2,vidstabdetect=result=${filterPath}:shakiness=5:accuracy=9:mincontrast=0.25`, "-an", "-f", "null", "-"], { signal });
    const frames = parseCameraMotionTransforms(await fs.readFile(transformPath, "utf8"), fps);
    return { frames, intervals: buildShakeIntervals(frames, metadata.duration), method: "vidstab-motion-v1" };
  } catch (error) {
    if (error?.code === "studio_cancelled") throw error;
    return { frames: [], intervals: [], method: "unavailable" };
  } finally {
    await fs.rm(transformPath, { force: true }).catch(() => {});
  }
}

const overlaps = (intervals, start, end) => intervals.some((item) => Number(item.end) > start && Number(item.start) < end);

export function buildQualityWindows(frames, duration, detections = {}) {
  const buckets = new Map();
  for (const frame of frames) {
    const second = Math.max(0, Math.floor(frame.time));
    buckets.set(second, [...(buckets.get(second) || []), frame]);
  }
  const total = Math.max(1, Math.ceil(Number(duration || 1)));
  const windows = [];
  for (let second = 0; second < total; second += 1) {
    const samples = buckets.get(second) || [];
    const brightness = samples.length ? samples.reduce((sum, item) => sum + item.brightness, 0) / samples.length : 0.5;
    const motion = samples.length ? samples.reduce((sum, item) => sum + item.motion, 0) / samples.length : 0.03;
    const blurSamples = samples.map((item) => item.blur).filter(Number.isFinite);
    const blur = blurSamples.length ? blurSamples.reduce((sum, value) => sum + value, 0) / blurSamples.length : 0;
    const flags = [];
    if (brightness < 0.13 || overlaps(detections.black || [], second, second + 1)) flags.push("dark");
    if (motion < 0.003 || overlaps(detections.freeze || [], second, second + 1)) flags.push("frozen");
    if (motion > 0.16) flags.push("high_motion");
    if (blur > 12) flags.push("blurred");
    if (overlaps(detections.shake || [], second, second + 1)) flags.push("shaky");
    const exposure = Math.max(0, 1 - Math.abs(brightness - 0.48) * 1.45);
    const movement = motion < 0.006 ? 0.25 : motion > 0.18 ? 0.45 : 1;
    const score = Math.max(0.05, Math.min(1, exposure * 0.62 + movement * 0.38 - (flags.includes("dark") ? 0.38 : 0) - (flags.includes("frozen") ? 0.32 : 0) - (flags.includes("blurred") ? 0.28 : 0) - (flags.includes("shaky") ? 0.24 : 0)));
    windows.push({ start: second, end: Math.min(total, second + 1), brightness: round(brightness), motion: round(motion), blur: round(blur), score: round(score), flags });
  }
  return windows;
}

export async function analyzeVideo(localPath, metadata, signal) {
  if (!metadata.hasVideo || metadata.contentType.startsWith("image/")) return { sceneTimes: [0], silences: [], qualityWindows: [{ start: 0, end: 15, brightness: 0.5, motion: 0, blur: 0, score: 0.82, flags: [] }], blackIntervals: [], freezeIntervals: [], shakeIntervals: [], analysisMethod: "still-image" };
  const tolerateAnalysisError = (error) => { if (error?.code === "studio_cancelled") throw error; return { stdout: error.stdout || "", stderr: error.stderr || "" }; };
  const scene = await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", localPath, "-vf", "select='gt(scene,0.32)',showinfo", "-an", "-f", "null", "-" ], { signal }).catch(tolerateAnalysisError);
  const signalAnalysis = await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", localPath, "-vf", "fps=2,scale=320:-2,signalstats,blurdetect=block_width=32:block_height=32,metadata=print,blackdetect=d=0.5:pix_th=0.10,freezedetect=n=-50dB:d=1", "-an", "-f", "null", "-"], { signal }).catch(tolerateAnalysisError);
  const silence = metadata.hasAudio ? await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", localPath, "-af", "silencedetect=noise=-35dB:d=0.8", "-f", "null", "-"], { signal }).catch(tolerateAnalysisError) : { stderr: "" };
  const camera = await analyzeCameraStability(localPath, metadata, signal);
  const log = `${signalAnalysis.stdout || ""}\n${signalAnalysis.stderr || ""}`;
  const blackIntervals = parseIntervals(log, "black");
  const freezeIntervals = parseIntervals(log, "freeze");
  const frames = parseSignalFrames(log);
  return {
    sceneTimes: [0, ...parseSceneTimes(scene.stderr)].filter((time, index, list) => time < metadata.duration && (index === 0 || time - list[index - 1] >= 1)),
    silences: parseSilences(silence.stderr),
    blackIntervals,
    freezeIntervals,
    shakeIntervals: camera.intervals,
    cameraAnalysisMethod: camera.method,
    qualityWindows: buildQualityWindows(frames, metadata.duration, { black: blackIntervals, freeze: freezeIntervals, shake: camera.intervals }),
    analysisMethod: "ffmpeg-technical-v2"
  };
}

export async function analyzeSources(sources, progress = () => {}, signal) {
  const results = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const metadata = await probeMedia(source.localPath, source.contentType, signal);
    const technical = await analyzeVideo(source.localPath, metadata, signal);
    technical.waveform = await analyzeAudioWaveform(source.localPath, metadata, signal);
    results.push({ ...source, metadata, technical });
    await progress(index + 1, sources.length);
  }
  return results;
}
