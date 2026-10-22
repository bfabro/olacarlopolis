import fs from "node:fs/promises";
import path from "node:path";
import { analyzeSources, summarizeCalibration } from "../src/analyzer.mjs";

const mediaDirectory = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Informe o diretório com vídeos reais para calibração.");
const entries = (await fs.readdir(mediaDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(mp4|mov|m4v|webm)$/i.test(entry.name))
  .slice(0, 20);
if (!entries.length) throw new Error("Nenhum vídeo compatível foi encontrado para calibração.");
const sources = entries.map((entry, order) => ({ id: `calibration-${order + 1}`, order, name: entry.name, contentType: entry.name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4", localPath: path.join(mediaDirectory, entry.name) }));
const analyzed = await analyzeSources(sources, (done, total) => process.stderr.write(`Analisando ${done}/${total}\n`));
process.stdout.write(`${JSON.stringify(summarizeCalibration(analyzed), null, 2)}\n`);
