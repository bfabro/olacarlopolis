import fs from "node:fs/promises";
import { studioOutputDimensions } from "../../shared/studio-contracts.mjs";

const assTime = (seconds) => {
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const whole = Math.floor(value % 60);
  const centiseconds = Math.floor((value - Math.floor(value)) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
};

const assColor = (hex, alpha = "00") => {
  const value = String(hex || "#FFFFFF").replace("#", "").padEnd(6, "F").slice(0, 6);
  return `&H${alpha}${value.slice(4, 6)}${value.slice(2, 4)}${value.slice(0, 2)}`;
};

const escapeAss = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\r?\n/g, "\\N").trim();

function dynamicText(segment) {
  if (!segment.words?.length) return escapeAss(segment.text);
  return segment.words.map((word) => {
    const duration = Math.max(1, Math.round((Number(word.end) - Number(word.start)) * 100));
    return `{\\kf${duration}}${escapeAss(word.text)}`;
  }).join(" ");
}

export function buildAssCaptions(transcription, options = {}) {
  const { width, height } = studioOutputDimensions(options.format || "9:16");
  const scale = Math.min(1.6, Math.max(0.7, Number(options.sizeScale || 1)));
  const fontSize = Math.round(width * (options.mode === "dynamic" ? 0.052 : 0.043) * scale);
  const alignment = options.position === "center" ? 5 : 2;
  const marginV = options.position === "center" ? 0 : Math.round(height * 0.12);
  const primary = assColor(options.color || "#FFFFFF");
  const secondary = assColor(options.highlightColor || "#FFBB2D");
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,DejaVu Sans,${fontSize},${primary},${secondary},&H00092B45,&H76000000,-1,0,0,0,100,100,0,0,3,3,1,${alignment},${Math.round(width * 0.07)},${Math.round(width * 0.07)},${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const rows = (transcription?.segments || []).filter((segment) => Number(segment.end) > Number(segment.start) && segment.text).map((segment) => {
    const value = options.mode === "dynamic" ? dynamicText(segment) : escapeAss(segment.text);
    return `Dialogue: 0,${assTime(segment.start)},${assTime(segment.end)},Caption,,0,0,0,,${value}`;
  });
  return `${header}\n${rows.join("\n")}\n`;
}

export async function writeAssCaptions(filePath, transcription, options = {}) {
  await fs.writeFile(filePath, buildAssCaptions(transcription, options), "utf8");
  return filePath;
}
