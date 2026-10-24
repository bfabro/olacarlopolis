import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const databaseRules = readFileSync(new URL("../database.rules.json", import.meta.url), "utf8");
const storageRules = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");
const html = readFileSync(new URL("../estudio/index.html", import.meta.url), "utf8");
const client = readFileSync(new URL("../estudio/studio.js", import.meta.url), "utf8");
const panel = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const workerQueue = readFileSync(new URL("../studio-worker/src/queue.mjs", import.meta.url), "utf8");
const workerMain = readFileSync(new URL("../studio-worker/src/index.mjs", import.meta.url), "utf8");
const workerCleanup = readFileSync(new URL("../studio-worker/src/cleanup.mjs", import.meta.url), "utf8");
const workerCompose = readFileSync(new URL("../studio-worker/docker-compose.yml", import.meta.url), "utf8");
const soundLibrary = readFileSync(new URL("../studio-worker/src/sound-library.mjs", import.meta.url), "utf8");

test("Studio não é exposto na navegação pública e abre protegido pelo painel Master", () => {
  assert.match(panel, /data-master="true" href="\.\.\/estudio\/\?preview=1"/);
  assert.doesNotMatch(readFileSync(new URL("../index.html", import.meta.url), "utf8"), /href="[^\"]*estudio/);
  assert.match(html, /meta name="robots" content="noindex,nofollow"/);
  assert.match(client, /state\.profile\.role !== "master"/);
  assert.match(client, /studioFeatureFlags\/enabled/);
});

test("Realtime Database isola Studio e exclui caminhos do fallback permissivo", () => {
  const parsed = JSON.parse(databaseRules);
  for (const path of ["studioProjects", "studioJobs", "studioUsage", "studioCredits", "studioCreditLedger", "studioAdminCosts", "studioFeatureFlags"]) assert.ok(parsed.rules[path], `regra ausente: ${path}`);
  assert.match(databaseRules, /auth\.uid === \$uid/);
  assert.match(parsed.rules.$other[".read"], /studioProjects/);
  assert.match(parsed.rules.$other[".write"], /studioJobs/);
});

test("Storage aceita originais privados e reserva renders ao worker", () => {
  assert.match(storageRules, /match \/studio\/\{userId\}\/originals/);
  assert.match(storageRules, /request\.auth\.uid == userId/);
  assert.match(storageRules, /match \/studio\/\{userId\}\/renders/);
  assert.match(storageRules, /allow write: if false/);
  const studioRules = storageRules.split("// Olá Studio")[1].split("// Comprovantes financeiros")[0];
  assert.doesNotMatch(studioRules, /allow read: if true/);
});

test("frontend envia arquivos direto ao Firebase Storage e acompanha fila real", () => {
  assert.match(client, /uploadBytesResumable/);
  assert.match(client, /studioJobs\/\$\{state\.user\.uid\}/);
  assert.match(client, /onValue\(ref\(db, `studioJobs/);
  assert.match(client, /getDownloadURL\(outputRef\)/);
  assert.match(client, /getBlob\(outputRef\)/);
  assert.match(client, /data-project-download/);
  assert.match(client, /data-project-open/);
  assert.match(client, /cancel_requested/);
  assert.match(client, /data-project-cancel/);
  assert.match(client, /awaiting_review/);
  assert.match(client, /approveTranscriptReview/);
  assert.match(client, /browserLocalPersistence/);
  assert.match(client, /setPersistence\(auth, browserLocalPersistence\)/);
  assert.match(client, /resumeLatestProcessing/);
  assert.match(client, /data-project-progress/);
  assert.match(client, /studioAdminCosts/);
  assert.match(client, /aiEstimatedCostUsd/);
  assert.match(html, /id="processingRemaining"/);
  assert.match(html, /data-studio-version>v42/);
  assert.match(html, /id="enableAiNarration"/);
  assert.match(client, /narrationEstimatedCostUsd/);
  assert.match(client, /sanitizeTranscriptReviewSegments/);
  assert.match(client, /transcriptReview\/segments.*reviewedSegments\.filter/);
  assert.match(html, /data-studio-view="logs"/);
  assert.match(html, /id="fieldHelpDialog"/);
  assert.match(client, /async function loadLogs/);
  assert.match(client, /function initializeEditorHelp/);
  assert.match(client, /dataset\.helpTooltip = info\.body/);
  assert.match(readFileSync(new URL("../estudio/studio-overrides.css", import.meta.url), "utf8"), /data-help-tooltip.*:hover::after/);
  assert.match(html, /id="transcriptReviewPlayer"/);
  assert.match(html, /id="transcriptPreviousButton"/);
  assert.match(client, /function previewTranscriptSegment/);
  assert.match(client, /currentTime >= Number\(segment\.end/);
  assert.match(workerMain, /renders\/\$\{job\.projectId\}\/reviews\/\$\{job\.jobId\}\.mp4/);
  assert.match(workerMain, /preview: reviewPreview/);
  assert.match(workerMain, /event: \{ level: "error", code: errorCode/);
  assert.doesNotMatch(client, /setInterval\([^)]*progress/i);
});

test("todos os campos da edição automática possuem ajuda contextual", () => {
  const editorHtml = html.split('<section id="editorView"')[1].split('<section id="visualView"')[0];
  const ids = [...editorHtml.matchAll(/<(?:input|select|textarea)\s+id="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length >= 35);
  ids.forEach((id) => assert.match(client, new RegExp(`\\b${id}: \\{`), `Ajuda ausente para ${id}`));
  assert.match(client, /control\.name === "editStyle"/);
  assert.match(client, /control\.name === "format"/);
  assert.match(client, /control\.name === "duration"/);
});

test("editor visual reutiliza plano privado e envia somente origens do próprio projeto", () => {
  assert.match(html, /id="visualTimeline"/);
  assert.match(html, /id="visualGeneratePreview"/);
  assert.match(html, /id="visualVersionHistory"/);
  assert.match(html, /id="visualWaveform"/);
  assert.match(html, /id="visualTextLayers"/);
  assert.match(html, /id="visualRegenerateAutomatic"/);
  assert.match(html, /id="visualVoiceVolume"/);
  assert.match(html, /id="visualMusicDucking"/);
  assert.match(html, /id="visualTextFont"/);
  assert.match(html, /id="visualTextSize"/);
  assert.match(html, /id="visualTextOutline"/);
  assert.match(client, /data-scene-trim-start/);
  assert.match(client, /data-scene-trim-end/);
  assert.match(client, /data-scene-transition-duration/);
  assert.match(client, /visualTransitionDurationLimit/);
  assert.match(client, /clampVisualTransitionDuration/);
  assert.match(client, /data-layer-field="sizeScale"/);
  assert.match(client, /data-layer-field="background"/);
  assert.match(html, /id="exportFps"/);
  assert.match(html, /id="exportQuality"/);
  assert.match(html, /id="visualExportFps"/);
  assert.match(html, /id="visualExportQuality"/);
  assert.match(client, /inlinePlan \|\| await readPrivateJson\(planPath\)/);
  assert.match(client, /Promise\.allSettled\(project\.sources/);
  assert.match(client, /planOverride/);
  assert.match(client, /mode === "preview"/);
  assert.match(client, /data-version-download/);
  assert.match(client, /data-version-restore/);
  assert.match(client, /version\.editorPlan \|\| await readPrivateJson\(version\.planStoragePath\)/);
  assert.match(html, /id="visualNarrationScript"/);
  assert.match(html, /id="visualNarrationEnabled"/);
  assert.match(workerMain, /const renderedEditorPlan = JSON\.parse\(JSON\.stringify\(rendered\.plan\)\)/);
  assert.match(workerMain, /\/editorPlan`\] = renderedEditorPlan/);
  assert.match(workerMain, /sceneCount: Array\.isArray\(plan\.scenes\)/);
  assert.match(workerMain, /videoBitrateKbps: Number\(plan\.export/);
  assert.doesNotMatch(client, /OPENAI_API_KEY/);
});

test("biblioteca sonora é interna e IA permanece protegida no worker", () => {
  assert.match(html, /id="libraryMusic"/);
  assert.match(html, /id="transitionSound"/);
  assert.match(html, /id="visualLibraryMusic"/);
  assert.match(html, /id="visualTransitionSound"/);
  assert.match(workerCompose, /OPENAI_API_KEY:\s*\$\{OPENAI_API_KEY:-\}/);
  assert.match(workerCompose, /STUDIO_OPENAI_MODEL:\s*\$\{STUDIO_OPENAI_MODEL:-gpt-6-luna\}/);
  assert.doesNotMatch(soundLibrary, /https?:\/\//);
  assert.doesNotMatch(soundLibrary, /fetch\(/);
});

test("worker consulta e reserva a fila com autenticação e concorrência segura", () => {
  assert.match(workerQueue, /Authorization: `Bearer \$\{token\.access_token\}`/);
  assert.match(workerQueue, /"X-Firebase-ETag": "true"/);
  assert.match(workerQueue, /"If-Match": currentResponse\.headers\.get\("etag"\)/);
  assert.match(workerQueue, /claimResponse\.status === 412/);
});

test("exclusão de projeto exige confirmação vinculada e escopo privado", () => {
  assert.match(client, /data-project-delete/);
  assert.match(client, /window\.confirm/);
  assert.match(client, /deletionAuthorized: true/);
  assert.match(client, /deletionToken/);
  assert.match(workerMain, /job\.deletionToken !== request\.token/);
  assert.match(workerMain, /request\.requestedBy !== job\.uid/);
  assert.match(workerMain, /deleteProjectAssets\(job\.uid, job\.projectId\)/);
  for (const folder of ["originals", "logos", "music", "plans", "renders"]) assert.match(workerCleanup, new RegExp(`"${folder}"`));
  assert.match(workerCleanup, /\^\[a-zA-Z0-9_-\]/);
});
