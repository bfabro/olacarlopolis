import fs from "node:fs/promises";
import { compareDirectorPlans } from "../src/evaluation.mjs";

const [baselinePath, advancedPath] = process.argv.slice(2);
if (!baselinePath || !advancedPath) {
  console.error("Uso: node scripts/compare-directors.mjs plano-local.json plano-avancado.json");
  process.exitCode = 1;
} else {
  const [baseline, advanced] = await Promise.all([baselinePath, advancedPath].map(async (file) => JSON.parse(await fs.readFile(file, "utf8"))));
  console.log(JSON.stringify(compareDirectorPlans(baseline, advanced), null, 2));
}
