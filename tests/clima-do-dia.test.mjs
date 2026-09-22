import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const site = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const panel = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("Clima do Dia combina radar de chuva e malha regional de vento", () => {
  assert.match(html, /leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(site, /api\.rainviewer\.com\/public\/weather-maps\.json/);
  assert.match(site, /current: "precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m"/);
  assert.match(site, /data-clima-layer="ambos"/);
assert.match(site, /window\.addEventListener\("hashchange", renderizarRotaClima\)/);
  assert.match(site, /id="climaMapa"/);
  assert.match(css, /\.clima-map \{/);
  assert.match(css, /\.clima-map-marker \{/);
});

test("painel lunar e guia de meteoros consideram condições de observação", () => {
  assert.match(site, /class="moon-realistic"/);
  assert.match(site, /Taurídeas do Sul/);
  assert.match(site, /function calcularProbMeteoros\(date, fracLua, nebulosidade = 0\)/);
  assert.match(site, /id="meteor-direcao"/);
  assert.match(site, /índice é uma estimativa de visibilidade, não uma probabilidade matemática/);
  assert.match(css, /\.clima-moon-card/);
});

test("versões de site, painel e service worker avançam juntas", () => {
  assert.match(site, /Release do site v636/);
  assert.match(html, /style\.css\?v=487/);
  assert.match(html, /script\.js\?v=687/);
  assert.match(html, /Olá Carlópolis v509/);
  assert.match(panel, /numero: 772/);
  assert.match(panel, /label: "v779"/);
  assert.match(panel, /data: "2026-09-22"/);
  assert.match(panelHtml, /painel\.css\?v=478/);
  assert.match(panelHtml, /painel\.js\?v=709/);
  assert.match(worker, /2026-09-22-clima-mapa-lua-v827/);
});
