import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ola-pesca.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const site = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../ola-pesca.css", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
const context = { window: {}, console, Date, Math, setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => 0 } };
vm.runInNewContext(source, context);
const core = context.window.OlaPescaCore;

test("Pesque e Solte integra mapa, controles e progresso na tela de Jogos", () => {
  assert.match(html, /ola-pesca\.css\?v=15/);
  assert.match(html, /ola-pesca\.js\?v=15/);
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

test("catálogo possui as 14 espécies incluindo o lendário Tucunaré Dourado", () => {
  assert.equal(core.SPECIES.length, 14);
  assert.deepEqual(Array.from(core.SPECIES, item => item.id), ["lambari", "tilapia", "piau", "pacu", "traira", "curimbata", "carpa", "jundia", "pintado", "corvina", "tucunare", "tucunare_azulao", "tucunare_vermelho", "tucunare_dourado"]);
  assert.equal(core.SPECIES.find(item => item.id === "tucunare").scientific, "Cichla kelberi");
  assert.equal(core.SPECIES.find(item => item.id === "tucunare_azulao").scientific, "Cichla piquiti");
  assert.equal(core.SPECIES.find(item => item.id === "tucunare_vermelho").scientific, "Cichla mirianae");
  assert.equal(core.SPECIES.find(item => item.id === "tucunare_dourado").scientific, "Cichla sp. aureus");
  for (const item of core.SPECIES) {
    assert.ok(item.maximoBiologicoReferencia >= item.maximoJogavel);
    assert.ok(item.maxW > item.minW);
  }
});

test("v14 mantém o Dourado ao lado da pedra pequena no canto inferior direito", () => {
  const golden = core.SPECIES.find(item => item.id === "tucunare_dourado");
  assert.ok(golden);
  assert.equal(golden.image, "images/jogos/ola-pesca/tucunare-dourado-v13.png");
  assert.ok(golden.minL >= 45 && golden.maxL >= 95);
  assert.ok(golden.minW >= 3 && golden.maxW >= 14);
  assert.equal(core.SPOTS.some(spot => Object.hasOwn(spot.table, "tucunare_dourado")), false);
  assert.equal(core.isGoldenZone({ x: core.GOLDEN_ROCK.x, y: core.GOLDEN_ROCK.y }), true);
  assert.equal(core.isGoldenZone({ x: core.GOLDEN_ROCK.x - core.GOLDEN_ROCK.zoneRadius - 1, y: core.GOLDEN_ROCK.y }), false);
  assert.equal(core.GOLDEN_ROCK.chance, 0.003);
  assert.ok(core.GOLDEN_ROCK.x > 26 * 32);
  assert.ok(core.GOLDEN_ROCK.y > 16 * 32);
  assert.equal(core.GOLDEN_ROCK.radius, 0.4 * 32);
  assert.deepEqual({ ...core.emptyProgress().player }, { ...core.PLAYER_START });
  assert.match(source, /game\.player=\{\.\.\.PLAYER_START\}/);
  assert.match(source, /Math\.hypot\(x-SNAG\.x,y-SNAG\.y\)<SNAG\.radius\+14/);
  assert.match(source, /rarity:"LENDÁRIO",trophyClass:"MONSTRO"/);
  assert.doesNotMatch(source, /strokeText\("PEDRA DOURADA"|fillText\("PEDRA DOURADA"/);
  assert.equal(fs.existsSync(new URL("../images/jogos/ola-pesca/tucunare-dourado-v13.png", import.meta.url)), true);
});

test("v15 amplia o píer e oferece duas lanchas com espécies favorecidas diferentes", () => {
  assert.equal(core.MAP[10].slice(2, 9), "PPPPPPP");
  assert.deepEqual(Array.from(core.BOATS, item => item.id), ["branca", "preta"]);
  const white = core.boatFishingTable("branca");
  const black = core.boatFishingTable("preta");
  assert.ok(white.carpa > (black.carpa || 0));
  assert.ok(black.pintado > (white.pintado || 0));
  assert.ok(black.tucunare_azulao > (white.tucunare_azulao || 0));
  assert.match(source, /function nearBoatOption/);
  assert.match(source, /g\.player\.boatId=option\.id/);
  assert.match(source, /Cada uma favorece espécies diferentes/);
});

test("v15 anima pescadores de margem e exibe somente logos financeiras sincronizadas", () => {
  assert.equal(core.SHORE_FISHERS.length, 5);
  assert.match(source, /function drawShoreFisher/);
  assert.match(source, /cycle>10100&&cycle<11150/);
  assert.match(source, /jogos\/olaPesca\/sponsors/);
  assert.match(source, /function drawSponsors/);
  assert.deepEqual(
    Array.from(core.normalizeFishingSponsors({ a: { name: "Loja A", image: "a.png", updatedAt: 2 }, b: { name: "", image: "b.png" } }), item => item.id),
    ["a"]
  );
  assert.match(panel, /function syncFishingSponsors/);
  assert.match(panel, /financePaymentStatusForMonth\(client, monthKey\) === "pago"/);
  assert.match(panel, /"jogos\/olaPesca\/sponsors"/);
  assert.equal(rules.rules.jogos[".read"], true);
  assert.match(rules.rules.jogos.olaPesca.sponsors[".write"], /role.*master.*role.*admin/);
  assert.equal(rules.rules.jogos.olaPesca.$other[".write"], true);
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

test("v9 aumenta a faixa verde e mostra a espécie fisgada no salto acima de 6 kg", () => {
  assert.match(source, /function battleGreen/);
  assert.match(source, /width=14\+tired\*24/);
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

test("v10 usa o ID local, migra a chave de autenticação e mantém todos os jogadores", () => {
  const ranking = [
    { id: "local-a", name: "Ana", speciesId: "pintado", speciesName: "Pintado", bestWeight: 12, bestLength: 90, captures: 4 },
    { id: "local-a2", name: "Ana", speciesId: "traira", speciesName: "Traíra", bestWeight: 7, bestLength: 62, captures: 2 },
    { id: "local-b", name: "Beto", speciesId: "pacu", speciesName: "Pacu", bestWeight: 5, bestLength: 50, captures: 2 },
    { id: "uid-ana", ownerUid: "uid-ana", name: "Ana", speciesId: "tilapia", speciesName: "Tilápia", bestWeight: 4, bestLength: 55, captures: 1 }
  ];
  const progress = [
    { id: "uid-ana", userId: "uid-ana", rankingPlayerId: "local-a", playerName: "Ana", captures: [{ speciesId: "pintado", speciesName: "Pintado", weight: 12, length: 90, capturedAt: "2026-09-23T10:00:00.000Z" }], stats: { totalFishCaught: 8 } },
    { id: "uid-cida", userId: "uid-cida", rankingPlayerId: "local-c", playerName: "Cida", captures: [{ speciesId: "carpa", speciesName: "Carpa", weight: 8, length: 70, capturedAt: "2026-09-23T11:00:00.000Z" }], stats: { totalFishCaught: 3 } }
  ];
  const merged = core.mergeRankingEntries(ranking, progress);
  assert.equal(merged.length, 4);
  assert.deepEqual(Array.from(merged, item => item.name), ["Ana", "Cida", "Ana", "Beto"]);
  assert.equal(merged[0].ownerUid, "uid-ana");
  assert.equal(merged[0].captures, 8);
  assert.match(source, /jogos\/olaPesca\/users/);
  assert.match(source, /function rankingPlayerKey\(\)\{return playerId\(\)\}/);
  assert.match(source, /ranking\/\$\{localId\}/);
  assert.match(source, /a\.length===1\?"jogador":"jogadores"/);
});

test("v10 classifica lendário pelo peso e comprimento relativos da espécie", () => {
  for (const species of core.SPECIES) {
    assert.equal(core.rarityBySize(species, species.maxL, species.maxW), "LENDÁRIO");
    assert.notEqual(core.rarityBySize(species, species.maxL, species.minW), "LENDÁRIO");
    assert.notEqual(core.rarityBySize(species, species.minL, species.maxW), "LENDÁRIO");
  }
  assert.match(source, /lengthRatio>=\.94&&z\.weightRatio>=\.92/);
  assert.match(source, /rarity:rarityBySize\(s,length,weight\)/);
});

test("v10 reproduz som de impacto quando a boia cai na água", () => {
  assert.match(source, /function splashSound\(delay=\.3\)/);
  assert.match(source, /createBuffer\(1,frames,a\.sampleRate\)/);
  assert.match(source, /if\(a\.state==="suspended"\)a\.resume\(\)/);
  assert.match(source, /filter\.type="lowpass"/);
  assert.match(source, /if\(g\.mode==="waiting"\)splashSound\(\.3\)/);
});

test("v12 carrega Duda, permite o retorno do JP e mostra a data da pescaria", () => {
  const ranking = [
    { id: "mue998rs-viuinu4", name: "Bruno Fabro", bestWeight: 20.5, bestLength: 90.5, speciesId: "carpa", speciesName: "Carpa", bestAt: 1790180344040 },
    { id: "muemyg23-n8ctz7u", name: "Duda", bestWeight: 12.15, bestLength: 95.6, speciesId: "pintado", speciesName: "Pintado", bestAt: 1790200469664 },
    { id: "mue7bb2q-iroenw4", name: "JP", bestWeight: 5.291, bestLength: 88, speciesId: "pintado", speciesName: "Pintado", bestAt: 1790202000000 },
    { id: "uid-bruno", ownerUid: "uid-bruno", name: "Bruno Fabro", bestWeight: 4.3, bestLength: 60, speciesId: "tilapia", speciesName: "Tilápia", bestAt: 1790201178170 }
  ];
  const merged = core.mergeRankingEntries(ranking);
  assert.deepEqual(Array.from(merged, item => item.name), ["Bruno Fabro", "Duda", "JP"]);
  assert.equal(merged.find(item => item.name === "Duda")?.bestWeight, 12.15);
  assert.equal(merged.some(item => item.name === "JP"), true);
  assert.doesNotMatch(source, /RANKING_BLOCKED_IDS/);
  assert.match(source, /function fetchRankingRows/);
  assert.match(source, /ranking\.json\?ts=\$\{Date\.now\(\)\}/);
  assert.match(source, /cache:"no-store"/);
  assert.match(source, /rankingTimeout\(task,ms=3500\)/);
  assert.match(source, /Pescado em \$\{rankingDate\(x\.bestAt\|\|x\.updatedAt\)\}/);
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
