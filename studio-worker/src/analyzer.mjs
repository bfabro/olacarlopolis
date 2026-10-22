import { workerConfig } from "./config.mjs";
import { runProcess } from "./process-utils.mjs";

export async function probeMedia(localPath, contentType = "", signal) {
  const { stdout } = await runProcess(workerConfig.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", localPath], { signal });
  const data = JSON.parse(stdout || "{}");
  const video = (data.streams || []).find((stream) => stream.codec_type === "video");
  const audio = (data.streams || []).find((stream) => stream.codec_type === "audio");
  const duration = Number(data.format?.duration || video?.duration || 0);
  return { duration: Number.isFinite(duration) ? duration : 0, width: Number(video?.width || 0), height: Number(video?.height || 0), hasVideo: Boolean(video), hasAudio: Boolean(audio), contentType };
}

export function parseSceneTimes(log = "") {
  return [...String(log).matchAll(/pts_time:([0-9.]+)/g)].map((match) => Number(match[1])).filter(Number.isFinite);
}

export function parseSilences(log = "") {
  const starts = [...String(log).matchAll(/silence_start:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...String(log).matchAll(/silence_end:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  return starts.map((start, index) => ({ start, end: ends[index] ?? start, duration: Math.max(0, (ends[index] ?? start) - start) }));
}

export async function analyzeVideo(localPath, metadata, signal) {
  if (!metadata.hasVideo || metadata.contentType.startsWith("image/")) return { sceneTimes: [0], silences: [] };
  const tolerateAnalysisError = (error) => { if (error?.code === "studio_cancelled") throw error; return { stderr: error.stderr || "" }; };
  const scene = await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", localPath, "-vf", "select='gt(scene,0.32)',showinfo", "-an", "-f", "null", "-" ], { signal }).catch(tolerateAnalysisError);
  const silence = metadata.hasAudio ? await runProcess(workerConfig.ffmpegPath, ["-hide_banner", "-i", localPath, "-af", "silencedetect=noise=-35dB:d=0.8", "-f", "null", "-"], { signal }).catch(tolerateAnalysisError) : { stderr: "" };
  return { sceneTimes: [0, ...parseSceneTimes(scene.stderr)].filter((time, index, list) => time < metadata.duration && (index === 0 || time - list[index - 1] >= 1)), silences: parseSilences(silence.stderr) };
}

export async function analyzeSources(sources, progress = () => {}, signal) {
  const results = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    const metadata = await probeMedia(source.localPath, source.contentType, signal);
    const technical = await analyzeVideo(source.localPath, metadata, signal);
    results.push({ ...source, metadata, technical });
    await progress(index + 1, sources.length);
  }
  return results;
}
