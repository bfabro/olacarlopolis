import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const site = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const panel = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
const story = readFileSync(new URL("../clima-story.js", import.meta.url), "utf8");

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

test("radar de chuva anima a sequência temporal e oferece controles", () => {
  assert.match(site, /radarResposta\?\.radar\?\.past/);
  assert.match(site, /radarResposta\?\.radar\?\.nowcast/);
  assert.match(site, /function mostrarQuadroRadar\(index\)/);
  assert.match(site, /setInterval\(\(\) => \{/);
  assert.match(site, /id="climaRadarPlay"/);
  assert.match(site, /id="climaRadarTimeline"/);
  assert.match(site, /id="climaRadarHorario"/);
  assert.match(css, /\.clima-radar-controls \{/);
  assert.match(site, /climaRadarTimer = setInterval/);
  assert.match(site, /const carregamentosRadar = radarLayers\.map/);
  assert.match(site, /await Promise\.all\(carregamentosRadar\)/);
  assert.match(site, /layer\.setOpacity\(radarVisivel && index === radarFrameIndex/);
  assert.doesNotMatch(site, /climaMapInstance\.removeLayer\(radarLayer\)/);
  assert.match(css, /\.clima-map \.clima-radar-frame \{ transition: opacity/);
});
test("painel lunar e guia de meteoros consideram condições de observação", () => {
  assert.match(site, /class="moon-realistic"/);
  assert.match(site, /Taurídeas do Sul/);
  assert.match(site, /function calcularProbMeteoros\(date, fracLua, nebulosidade = 0\)/);
  assert.match(site, /id="meteor-direcao"/);
  assert.match(site, /índice é uma estimativa de visibilidade, não uma probabilidade matemática/);
  assert.match(css, /\.clima-moon-card/);
});

test("Clima do Dia gera arte vertical pronta para Instagram Stories", () => {
  assert.match(site, /id="climaStoryTrigger"/);
  assert.match(html, /clima-story\.js\?v=3/);
  assert.match(story, /canvas\.width = 1080/);
  assert.match(story, /canvas\.height = 1920/);
  assert.match(story, /REPRESA DE CHAVANTES/);
  assert.match(story, /cm em 1 dia/);
  assert.match(story, /LUA ATUAL/);
  assert.match(story, /function greeting\(\)/);
  assert.match(story, /document\.querySelector\("#lua-desenho svg"\)/);
  assert.match(story, /new XMLSerializer\(\)/);
  assert.match(story, /screenMoonImage\(\)/);
  assert.match(story, /toLocaleTimeString\("pt-BR"/);
  assert.match(story, /greetingGradient/);
  assert.match(story, /bezierCurveTo/);
  assert.match(story, /CARLÓPOLIS!/);
  assert.match(story, /function dailyMotivation\(date\)/);
  assert.match(story, /createImageData\(size, size\)/);
  assert.match(story, /sunX = -Math\.sin/);
  assert.match(story, /VALOR DE REFERÊNCIA/);
  assert.match(story, /474,00 m/);
  assert.match(story, /CONDIÇÃO ATUAL/);
  assert.match(story, /navigator\.share/);
  assert.match(story, /logo-ola-carlopolis\.png\.png/);
  assert.match(css, /\.clima-story-trigger/);
  assert.match(css, /\.clima-story-modal/);
  assert.match(worker, /clima-story\.js/);
});
test("versões de site, painel e service worker avançam juntas", () => {
  assert.match(site, /Release do site v659/);
  assert.match(html, /style\.css\?v=586/);
  assert.match(html, /script\.js\?v=786/);
  assert.match(html, /Olá Carlópolis v532/);
  assert.match(panel, /numero: 872/);
  assert.match(panel, /label: "v879"/);
  assert.match(panel, /data: "2026-10-12"/);
  assert.match(panelHtml, /painel\.css\?v=577/);
  assert.match(panelHtml, /painel\.js\?v=879/);
  assert.match(worker, /2026-10-12-pesque-solte-v926/);
});
