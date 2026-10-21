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
  assert.match(site, /function caminhoIluminadoLua\(fraction, waxing\)/);
  assert.match(site, /Math\.cos\(2 \* Math\.PI \* fase\)/);
  assert.match(story, /Math\.cos\(2 \* Math\.PI \* fraction\)/);
  assert.match(site, /clipPath id="\$\{uid\}-light"/);
  assert.doesNotMatch(site, /const shadowOffset = \(waxing/);
  assert.doesNotMatch(site, /mask id="\$\{uid\}-phase"/);
  assert.match(site, /Taurídeas do Sul/);
  assert.match(site, /function calcularProbMeteoros\(date, fracLua, nebulosidade = 0\)/);
  assert.match(site, /id="meteor-direcao"/);
  assert.match(site, /índice é uma estimativa de visibilidade, não uma probabilidade matemática/);
  assert.match(css, /\.clima-moon-card/);
});

test("Clima do Dia gera arte vertical pronta para Instagram Stories", () => {
  assert.match(site, /id="climaStoryTrigger"/);
  assert.match(html, /clima-story\.js\?v=16/);
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
  assert.match(story, /titleGradient/);
  assert.match(story, /drawImageCover/);
  assert.match(story, /CARLÓPOLIS!/);
  assert.match(story, /function dailyMotivation\(date\)/);
  assert.match(story, /createImageData\(size, size\)/);
  assert.match(story, /sunX = -Math\.sin/);
  assert.match(story, /474,00 m/);
  assert.match(story, /COMO SERÁ O DIA EM CARLÓPOLIS/);
  assert.match(story, /AGORA • ÀS/);
  assert.match(story, /navigator\.share/);
  assert.match(story, /logo_1\.png/);
  assert.match(story, /images\/turismo\/ponte\.jpg/);
  assert.match(story, /HOJE SE COMEMORA/);
  assert.match(story, /const celebrationItems = String\(dayCelebration\.title/);
  assert.doesNotMatch(story, /\(gerado\)/);
  assert.doesNotMatch(story, /CLIMA DO DIA • CARLÓPOLIS, PR/);
  assert.match(story, /LIMITE MÁXIMO NORMAL/);
  assert.doesNotMatch(story, /wrapped\(ctx, dayCelebration\.description/);
  assert.match(story, /celebrationItems\.forEach/);
  assert.match(story, /rounded\(ctx, 20, 420, 740, 455/);
  assert.match(story, /rounded\(ctx, 780, 432, 280, 443/);
  assert.match(story, /\["♨", "Sensação",/);
  assert.match(story, /dateLabel \+ "   \|   ◷  " \+ timeLabel, 52, 268/);
  assert.match(story, /rounded\(ctx, 20, 895, 750, 310/);
  assert.match(story, /lakeDate, 50, 1462\)/);
  assert.match(story, /id="climaStoryFontSize"/);
  assert.match(story, /createCanvas\(dateText, fontScale = 1\)/);
  assert.match(story, /Math\.min\(1\.25/);
  assert.match(story, /const cardFont = \(weight, size\) => weight \+ " " \+ size \+ "px Arial"/);
  assert.match(story, /const detailFont = \(weight, size\).*safeFontScale/);
  assert.match(story, /rounded\(ctx, 36, 758, 708, 102/);
  assert.match(story, /description\(750, 20, advice\(forecast\), 390, 825, 650, 20, 2\)/);
  assert.doesNotMatch(story, /adviceTextX/);
  assert.match(story, /while \(size >= 8\)/);
  assert.match(story, /if \(lines.length <= maxLines\) break/);
  assert.match(story, /description\(650, 14, "Meteoros:/);
  assert.match(story, /drawMoon\(ctx, 925, 1010, 52/);
  assert.doesNotMatch(story, /Compartilhe com quem/);
  assert.match(css, /\.clima-story-font-control/);
  assert.doesNotMatch(story, /const footerItems/);
  assert.match(story, /pt\.wikipedia\.org\/w\/api\.php/);
  assert.match(story, /function celebration\(date\)/);
  assert.match(story, /hourly: "temperature_2m,precipitation_probability,weather_code"/);
  assert.match(story, /drawReservoirChart/);
  assert.match(story, /\.\.\.forecast\.periods, \{ label: "SOL", sun: true \}/);
  assert.doesNotMatch(story, /ÍNDICE UV/);
  assert.match(story, /const axisValue = max - \(line \/ 3\) \* range/);
  assert.match(story, /rounded\(ctx, 790, 895, 270, 310/);
  assert.match(story, /drawImageCover\(ctx, background, 0, 0, 1080, 485\)/);
  assert.match(story, /olacarlopolis\.com  ➜/);
  assert.match(story, /history: days\.slice\(-7\)/);
  assert.match(css, /\.clima-story-trigger/);
  assert.match(css, /\.clima-story-modal/);
  assert.match(worker, /clima-story\.js/);
  assert.match(html, /service-worker\.js\?v=940/);
  assert.match(html, /updateViaCache: 'none'/);
  assert.match(html, /controllerchange/);
  assert.match(site, /service-worker\.js\?v=940/);
  assert.match(site, /reg\.update\(\)/);
});
test("máxima e mínima incluem a temperatura atual sem misturar datas", () => {
  const source = story.match(/function consistentTemperatureRange\(data\) \{[\s\S]*?\n  \}(?=\n  async function weather)/);
  assert.ok(source, "função de consistência térmica não encontrada");
  const range = new Function(`${source[0]}; return consistentTemperatureRange;`)();
  const base = {
    daily: { time: ["2026-10-13"], temperature_2m_min: [18.2], temperature_2m_max: [23.2] },
    hourly: { temperature_2m: [null, "", 18.4, 22.9] },
    current: { time: "2026-10-13T15:30", temperature_2m: 23.6 }
  };
  assert.deepEqual(range(base), { min: 18.2, max: 23.6 });
  assert.deepEqual(range({ ...base, current: { time: "2026-10-13T06:30", temperature_2m: 17.9 } }), { min: 17.9, max: 23.2 });
  assert.deepEqual(range({ ...base, current: { time: "2026-10-14T12:00", temperature_2m: 30 } }), { min: 18.2, max: 23.2 });
  assert.deepEqual(range({
    daily: { time: ["2026-10-13"], temperature_2m_min: [null], temperature_2m_max: [null] },
    hourly: { temperature_2m: [null, ""] }, current: { time: "2026-10-13T12:00", temperature_2m: null }
  }), { min: null, max: null });
  const publicSource = site.match(/function intervaloTemperaturaConsistente\(data\) \{[\s\S]*?\n  \}(?=\n\n  async function buscarTempo)/);
  assert.ok(publicSource, "função pública de consistência térmica não encontrada");
  const publicRange = new Function(`${publicSource[0]}; return intervaloTemperaturaConsistente;`)();
  assert.deepEqual(publicRange(base), { min: 18.2, max: 23.6 });
  assert.match(site, /hourly: "visibility,temperature_2m"/);
});
test("mensagem motivacional oferece uma frase bem-humorada para cada dia do ano", () => {
  const source = story.match(/function dailyMotivation\(date\) \{[\s\S]*?\n  \}(?=\n  function meteor)/);
  assert.ok(source, "função diária não encontrada");
  const motivation = new Function(`${source[0]}; return dailyMotivation;`)();
  const messages = Array.from({ length: 366 }, (_, index) => motivation(new Date(2028, 0, index + 1, 12)));
  assert.equal(new Set(messages).size, 366);
  assert.ok(messages.every((message) => message.includes("—")));
  assert.equal(motivation(new Date(2028, 1, 29, 8)), motivation(new Date(2028, 1, 29, 20)));
  assert.doesNotMatch(source[0], /Math\.random/);
});
test("versões de site, painel e service worker avançam juntas", () => {
  assert.match(site, /Release do site v685/);
  assert.match(html, /style\.css\?v=612/);
  assert.match(html, /script\.js\?v=812/);
  assert.match(html, /Olá Carlópolis v558/);
  assert.match(panel, /numero: 898/);
  assert.match(panel, /label: "v905"/);
  assert.match(panel, /data: "2026-10-21"/);
  assert.match(panelHtml, /painel\.css\?v=603/);
  assert.match(panelHtml, /painel\.js\?v=905/);
  assert.match(worker, /2026-10-21-resumo-novidades-agencia-v952/);
});
