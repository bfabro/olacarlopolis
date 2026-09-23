import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ola-pesca.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const site = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../ola-pesca.css", import.meta.url), "utf8");
const context = { window: {}, console, Date, Math, setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => 0 } };
vm.runInNewContext(source, context);
const core = context.window.OlaPescaCore;

test("Pesque e Solte integra mapa, controles e progresso na tela de Jogos", () => {
  assert.match(html, /ola-pesca\.css\?v=8/);
  assert.match(html, /ola-pesca\.js\?v=8/);
  assert.match(site, /Pesque e Solte/);
  assert.match(source, /PESQUE E SOLTE/);
  assert.match(site, /btnJogarOlaPesca/);
  assert.match(site, /#ola-pesca/);
  assert.match(source, /data-dir="up"/);
  assert.match(source, /e\.code==="KeyA"/);
  assert.match(source, /localStorage\.setItem\(KEY/);
  assert.match(source, /jogos\/olaPesca\/users/);
  assert.match(css, /touch-action:none/);
});

test("v2 amplia a represa e permite pesca livre, barco e arremesso carregado", () => {
  assert.equal(core.MAP.length, 20);
  assert.equal(core.MAP[0].length, 32);
  assert.match(source, /function waterDir/);
  assert.doesNotMatch(source, /ponto amarelo/i);
  assert.match(source, /g\.mode="charging"/);
  assert.match(source, /performance\.now\(\)-g\.chargeAt/);
  assert.match(source, /g\.player\.inBoat=true/);
  assert.match(source, /Meio da represa/);
});

test("v2 mostra imagens, local da fisgada, fechamento e ranking exclusivo", () => {
  assert.match(source, /peixes-sprites-v2\.png/);
  assert.match(source, /data-catch-close/);
  assert.match(source, /Por onde fisgou/);
  assert.match(source, /jogos\/olaPesca\/ranking/);
  assert.match(source, /data-panel="ranking"/);
  assert.match(css, /\.fish-sprite/);
  assert.match(css, /\.pesca-battle\{right:10px/);
  assert.match(source, /quadraticCurveTo/);
});

test("catálogo possui as 13 espécies incluindo três tucunarés", () => {
  assert.equal(core.SPECIES.length, 13);
  assert.deepEqual(Array.from(core.SPECIES, item => item.id), ["lambari", "tilapia", "piau", "pacu", "traira", "curimbata", "carpa", "jundia", "pintado", "corvina", "tucunare", "tucunare_azulao", "tucunare_vermelho"]);
  assert.equal(core.SPECIES.find(item => item.id === "tucunare").scientific, "Cichla kelberi");
  assert.equal(core.SPECIES.find(item => item.id === "tucunare_azulao").scientific, "Cichla piquiti");
  assert.equal(core.SPECIES.find(item => item.id === "tucunare_vermelho").scientific, "Cichla mirianae");
  for (const item of core.SPECIES) {
    assert.ok(item.maximoBiologicoReferencia >= item.maximoJogavel);
    assert.ok(item.maxW > item.minW);
  }
});

test("v3 aplica fisgada corporal, duas falhas vermelhas e frases de fuga", () => {
  assert.match(source, /HOOK_POINTS=\["Pela boca"/);
  assert.match(source, /hookPoint:HOOK_POINTS/);
  assert.match(source, /b\.redHits>=2/);
  assert.match(source, /LOSE_QUOTES/);
  assert.match(source, /2 erros no vermelho = escapou/);
});

test("v3 mantém cardume por dois minutos e força uma única espécie", () => {
  assert.match(source, /expiresAt:Date\.now\(\)\+120000/);
  assert.match(source, /schoolSpeciesId:school/);
  assert.match(source, /table:\{\[g\.cast\.schoolSpeciesId\]:1\}/);
  assert.match(source, /function drawSchool/);
});

test("v3 mostra sprites dos tucunarés e imagem do peixe no ranking", () => {
  assert.match(source, /tucunare-azulao-v3\.png/);
  assert.match(source, /tucunare-vermelho-v3\.png/);
  assert.match(source, /speciesId:better\?c\.speciesId/);
  assert.match(source, /pesca-rank-item[\s\S]*fish-sprite/);
  assert.match(css, /grid-template-columns:38px 66px 1fr auto/);
});

test("v5 desenha a lancha em vistas coerentes com motor, bancos e rastro", () => {
  assert.match(source, /function drawBoatWake/);
  assert.match(source, /boat\(c,x,y\+5,g\.player\.facing,moving,n\)/);
  assert.match(source, /facing==="up"/);
  assert.match(source, /else\{const up=facing==="up"/);
  assert.match(source, /fillRect\(-12,up\?7:-12,24,5\)/);
  assert.match(source, /fillRect\(-7,up\?23:-31,14,10\)/);
  assert.match(source, /rgba\(220,250,255,\.72\)/);
  assert.match(source, /TREE_POSITIONS/);
  assert.match(source, /function drawTree/);
  assert.match(source, /function drawSnag/);
  assert.match(source, /#326a38/);
  assert.equal(core.SNAG.radius, 72);
  assert.match(source, /id:"galhada"/);
  assert.match(source, /bonus:\.16/);
});

test("v4 afunda a boia na mordida e em cada puxada correta", () => {
  assert.match(source, /g\.bobberAnimationAt=performance\.now\(\)/);
  assert.match(source, /sink\*17/);
  assert.match(source, /elapsed<560/);
  assert.match(source, /g\.mode==="waiting"\|\|animating/);
});

test("v4 usa relação alométrica realista entre comprimento e peso", () => {
  for (const item of core.SPECIES) {
    assert.ok(item.power >= 2.9 && item.power <= 3.25, `${item.name}: expoente ${item.power}`);
  }
});

test("v5 separa a fala do personagem e mostra somente a probabilidade na captura", () => {
  assert.match(source, /const CATCH_QUOTES=\{lambari:/);
  assert.match(source, /pesca-character-quote/);
  assert.match(source, /Probabilidade de captura/);
  assert.match(source, /CHANCE_LABEL\[c\.rarity\]/);
  assert.match(css, /\.pesca-character-quote p:after/);
  assert.match(css, /\.pesca-catch-probability/);
});

test("v5 usa modal mobile completo e ranking com o maior peixe de todos", () => {
  assert.match(css, /@media\(max-width:600px\)\{\.pesca-catch\{position:fixed/);
  assert.match(css, /min-height:100dvh/);
  assert.match(source, /loadRanking=async function/);
  assert.match(source, /ref\("jogos\/olaPesca\/ranking"\)\.once\("value"\)/);
  assert.match(source, /Maior: \$\{esc\(x\.speciesName/);
  assert.match(source, /todos os participantes/);
});

test("v6 mostra a chance em porcentagem e fala no personagem após fechar", () => {
  assert.match(source, /CHANCE_PERCENT=\{COMUM:"65%",INCOMUM:"23%",RARO:"9%",ÉPICO:"2,7%",LENDÁRIO:"0,3%"\}/);
  assert.match(source, /Probabilidade aproximada de captura/);
  assert.match(source, /g\.pendingCatchQuote=CATCH_QUOTES/);
  assert.match(source, /setTimeout\(\(\)=>game===g&&characterSpeech\(g,quote\),120\)/);
  assert.match(source, /function characterSpeech/);
  assert.match(css, /\.pesca-message\.character-speech/);
});

test("v6 amplia as imagens nos recordes pessoais e no ranking", () => {
  assert.match(source, /function openFishPreview/);
  assert.match(source, /data-fish-preview/);
  assert.match(source, /button\.className="pesca-record-fish"/);
  assert.match(source, /class="pesca-rank-fish"/);
  assert.match(source, /Referência máxima da espécie no jogo/);
  assert.match(css, /\.pesca-fish-preview/);
});

test("v8 aumenta a faixa verde e mostra a espécie fisgada no salto acima de 6 kg", () => {
  assert.match(source, /function battleGreen/);
  assert.match(source, /width=10\+tired\*24/);
  assert.match(source, /b\.cursor>=z\.left&&b\.cursor<=z\.right/);
  assert.match(source, /g\.fish\.weight<=6/);
  assert.match(source, /jump=Math\.sin\(t\*Math\.PI\)/);
  assert.match(source, /s=BY\[g\.fish\.speciesId\],img=fightingFishImage\(s\)/);
  assert.match(source, /fightingFishImage\(BY\[g\.fish\.speciesId\]\)/);
  assert.match(source, /if\(!img\?\.naturalWidth\)return/);
  assert.match(source, /c\.drawImage\(img,\(s\.sprite%4\)\*sw/);
  assert.match(source, /drawFightingFish\(c,g,n,q\)/);
});

test("v6 provoca tentativas secas e anima a vara durante o arremesso", () => {
  assert.match(source, /function dryCastTease/);
  assert.match(source, /A árvore não morde a isca/);
  assert.match(source, /No meio do nada/);
  assert.match(source, /return characterSpeech\(g,dryCastTease\(g\)\)/);
  assert.match(source, /e\.code!=="KeyA"\|\|g\.mode!=="explore"/);
  assert.match(source, /g\.keys\.left=false;startCharge\(g\)/);
  assert.match(source, /lift=charge\*36\+castSwing\*28/);
  assert.match(source, /g\.castAnimationAt=performance\.now\(\)/);
});

test("v7 consolida ranking e progresso mantendo o maior peixe por jogador", () => {
  const ranking = [
    { id: "local-a", name: "Ana", speciesId: "pintado", speciesName: "Pintado", bestWeight: 12, bestLength: 90, captures: 4 },
    { id: "local-b", name: "Beto", speciesId: "pacu", speciesName: "Pacu", bestWeight: 5, bestLength: 50, captures: 2 }
  ];
  const progress = [
    { id: "uid-ana", userId: "uid-ana", playerName: "Ana", captures: [{ speciesId: "pintado", speciesName: "Pintado", weight: 12, length: 90, capturedAt: "2026-09-23T10:00:00.000Z" }], stats: { totalFishCaught: 8 } },
    { id: "uid-cida", userId: "uid-cida", playerName: "Cida", captures: [{ speciesId: "carpa", speciesName: "Carpa", weight: 8, length: 70, capturedAt: "2026-09-23T11:00:00.000Z" }], stats: { totalFishCaught: 3 } }
  ];
  const merged = core.mergeRankingEntries(ranking, progress);
  assert.equal(merged.length, 3);
  assert.deepEqual(Array.from(merged, item => item.name), ["Ana", "Cida", "Beto"]);
  assert.equal(merged[0].ownerUid, "uid-ana");
  assert.equal(merged[0].captures, 8);
  assert.match(source, /jogos\/olaPesca\/users/);
  assert.match(source, /rankingPlayerKey/);
});

test("geração determinística mantém peso e comprimento correlacionados", () => {
  for (const spot of core.SPOTS) {
    for (let seed = 1; seed <= 800; seed += 1) {
      const fish = core.generateFish(seed, spot, 21);
      assert.equal(core.validateFishDimensions(fish), true);
      assert.ok(fish.length > 0 && fish.weight > 0);
    }
  }
  const first = core.generateFish(987654, core.SPOTS[2], 20);
  const repeated = core.generateFish(987654, core.SPOTS[2], 20);
  assert.deepEqual({ species: first.speciesId, length: first.length, weight: first.weight, rarity: first.rarity }, { species: repeated.speciesId, length: repeated.length, weight: repeated.weight, rarity: repeated.rarity });
});

test("capturas registram recorde, PESCAdex e histórico", () => {
  const progress = core.emptyProgress();
  const capture = core.generateFish(42, core.SPOTS[1], 12);
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = { setItem() {} };
  context.localStorage = globalThis.localStorage;
  core.captureFish(progress, capture);
  assert.equal(capture.isPersonalRecord, true);
  assert.equal(progress.discovered[capture.speciesId], true);
  assert.equal(progress.stats.totalFishCaught, 1);
  assert.equal(progress.records[capture.speciesId].captureId, capture.id);
  globalThis.localStorage = originalLocalStorage;
});
