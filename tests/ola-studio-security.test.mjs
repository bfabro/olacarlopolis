import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const databaseRules = readFileSync(new URL("../database.rules.json", import.meta.url), "utf8");
const storageRules = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");
const html = readFileSync(new URL("../estudio/index.html", import.meta.url), "utf8");
const client = readFileSync(new URL("../estudio/studio.js", import.meta.url), "utf8");
const panel = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const workerQueue = readFileSync(new URL("../studio-worker/src/queue.mjs", import.meta.url), "utf8");

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
  assert.match(client, /getBlob\(storageRef\(storage, output\.storagePath\)\)/);
  assert.match(client, /data-project-download/);
  assert.doesNotMatch(client, /setInterval\([^)]*progress/i);
});

test("worker consulta e reserva a fila com autenticação e concorrência segura", () => {
  assert.match(workerQueue, /Authorization: `Bearer \$\{token\.access_token\}`/);
  assert.match(workerQueue, /"X-Firebase-ETag": "true"/);
  assert.match(workerQueue, /"If-Match": currentResponse\.headers\.get\("etag"\)/);
  assert.match(workerQueue, /claimResponse\.status === 412/);
});
