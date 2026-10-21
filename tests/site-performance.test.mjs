import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const site = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const firebaseInit = readFileSync(new URL("../firebase-public-init.js", import.meta.url), "utf8");
const resumeBuilder = readFileSync(new URL("../resume-builder.js", import.meta.url), "utf8");
const netlify = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");

test("Firebase público não bloqueia o HTML nem baixa módulos administrativos", () => {
  assert.match(html, /<script defer src="https:\/\/www\.gstatic\.com\/firebasejs\/8\.10\.0\/firebase-app\.js"><\/script>/);
  assert.match(html, /<script defer src="https:\/\/www\.gstatic\.com\/firebasejs\/8\.10\.0\/firebase-database\.js"><\/script>/);
  assert.match(html, /<script defer src="firebase-public-init\.js\?v=1"><\/script>/);
  assert.doesNotMatch(html, /firebase-auth\.js/);
  assert.doesNotMatch(html, /firebase-storage\.js/);
  assert.ok(html.indexOf("firebase-public-init.js?v=1") < html.indexOf("script.js?v="));
  assert.match(firebaseInit, /window\.publicFirebaseDatabase = firebase\.database\(firebaseApp\)/);
});

test("dados completos do portal aguardam o navegador ficar ocioso na página inicial", () => {
  assert.match(site, /function agendarDadosPublicosEmSegundoPlano\(\)/);
  assert.match(site, /requestIdleCallback\(iniciar, \{ timeout: 1800 \}\)/);
  assert.match(site, /window\.setTimeout\(iniciar, 500\)/);
  assert.match(site, /if \(h && !ADMIN_CLIENTES_LOADED\)/);
  assert.doesNotMatch(site, /\n  aplicarDadosAdminClientesEmSegundoPlano\(renderizarTelaAtualComDadosAdmin\);/);
});

test("jsPDF é carregado somente quando o visitante solicita o currículo", () => {
  assert.doesNotMatch(html, /jspdf\.umd\.min\.js/);
  assert.match(resumeBuilder, /function ensureJsPdf\(\)/);
  assert.match(resumeBuilder, /script\.src = "https:\/\/cdn\.jsdelivr\.net\/npm\/jspdf@2\.5\.2\/dist\/jspdf\.umd\.min\.js"/);
  assert.match(resumeBuilder, /const jsPDF = await ensureJsPdf\(\)/);
  assert.doesNotMatch(resumeBuilder, /sidebar-version/);
});

test("arquivos versionados principais recebem cache longo no navegador", () => {
  assert.match(netlify, /for = "\/script\.js"[\s\S]*Cache-Control = "public, max-age=31536000, immutable"/);
  assert.match(netlify, /for = "\/style\.css"[\s\S]*Cache-Control = "public, max-age=31536000, immutable"/);
  assert.match(netlify, /for = "\/images\/\*"[\s\S]*max-age=604800, stale-while-revalidate=86400/);
});

test("título inicial do banner coincide com a configuração padrão aplicada depois", () => {
  assert.match(html, /id="homeQuickBannerTitle">Carlópolis em Tempo Real<\/h2>/);
  assert.match(site, /\|\| "Carlópolis em Tempo Real"/);
  assert.doesNotMatch(html, /Carlópolis em tempo real/);
});
