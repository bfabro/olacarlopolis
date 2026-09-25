import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ola-pesca.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const site = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../ola-pesca.css", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = fs.readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelCss = fs.readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");
const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
class FakeImage {
  constructor() { this.complete = false; this.naturalWidth = 0; }
  set src(value) { this.currentSrc = value; }
  get src() { return this.currentSrc; }
}
const context = { window: {}, console, Date, Math, Image: FakeImage, setTimeout, clearTimeout, setInterval, clearInterval, performance: { now: () => 0 } };
vm.runInNewContext(source, context);
const core = context.window.OlaPescaCore;

test("Pesque e Solte integra mapa, controles e progresso na tela de Jogos", () => {
  assert.match(html, /ola-pesca\.css\?v=45/);
  assert.match(html, /ola-pesca\.js\?v=45/);
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

test("catálogo possui as 18 espécies incluindo o lendário Tucunaré Dourado", () => {
  assert.equal(core.SPECIES.length, 18);
  assert.deepEqual(Array.from(core.SPECIES, item => item.id), ["lambari", "tilapia", "piau", "pacu", "traira", "curimbata", "carpa", "jundia", "pintado", "corvina", "tucunare", "tucunare_azulao", "tucunare_vermelho", "tucunare_dourado", "dourado_rio", "piracanjuba", "cachara", "jau"]);
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
  assert.equal(Array.from(core.MAP[10]).filter(tile => tile === "P").length, 6);
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
  assert.equal(rules.rules.jogos.olaPesca.ranking[".write"], true);
  assert.equal(rules.rules.jogos.olaPesca.users[".write"], true);
  assert.equal(rules.rules.jogos.olaPesca.goldenHall[".write"], true);
});

test("v16 mostra o peixe pendurado antes de abrir a ficha da captura", () => {
  assert.match(source, /g\.mode="landing"/);
  assert.match(source, /function drawLandedFish/);
  assert.match(source, /Olha o peixe pendurado na vara/);
  assert.match(source, /g\.landingTimer=setTimeout/);
  assert.match(source, /g\.mode="caught";showCatch\(g,captured\)/);
  assert.match(source, /showCatch\(g,captured\)\},3000/);
});

test("v16 mantém um casal de tucunarés em movimento e exige acerto preciso", () => {
  const gameState = { tucunareCouple: { startedAt: 0, speciesId: "tucunare_azulao", hiddenIndex: null } };
  const start = core.tucunareCouplePositions(gameState, 0);
  const moved = core.tucunareCouplePositions(gameState, 1000);
  assert.equal(start.length, 2);
  assert.ok(Math.hypot(start[0].x - moved[0].x, start[0].y - moved[0].y) > 10);
  assert.equal(core.tucunareCoupleHit(gameState, { x: start[0].x, y: start[0].y }, 0)?.index, 0);
  assert.equal(core.tucunareCoupleHit(gameState, { x: start[0].x + core.TUCUNARE_COUPLE_HIT_RADIUS + 5, y: start[0].y }, 0), null);
  assert.ok(core.TUCUNARE_COUPLE_HIT_RADIUS <= 20);
  for (let elapsed = 0; elapsed <= 180000; elapsed += 250) {
    for (const fish of core.tucunareCouplePositions(gameState, elapsed)) {
      assert.equal(core.MAP[Math.floor(fish.y / 32)]?.[Math.floor(fish.x / 32)], "W", `sombra fora da água em ${elapsed} ms`);
    }
  }
  assert.match(source, /g\.cast\.hitTucunareCouple=true/);
  assert.match(source, /g\.cast\.schoolSpeciesId=g\.tucunareCouple\.speciesId/);
  assert.match(source, /clearTimeout\(g\.waitTimer\)/);
  assert.match(source, /drawTucunareCouple/);
});

test("v16 impede rolagem horizontal nos recordes pessoais", () => {
  assert.match(css, /\.pesca-drawer,\.pesca-drawer>section,\.pesca-record-list\{max-width:100%;overflow-x:hidden\}/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.pesca-record-list article,\.pesca-record-list article>\*\{min-width:0\}/);
  assert.match(css, /@media\(max-width:600px\)\{\.pesca-record-list\{grid-template-columns:1fr\}/);
});

test("v17 mantém o píer ampliado dentro da água e a outra lancha estacionada", () => {
  assert.equal(core.MAP[10].slice(7, 13), "PPPPPP");
  assert.notEqual(core.MAP[10][6], "P");
  assert.deepEqual({ ...core.PLAYER_START }, { x: 7.5 * 32, y: 10.5 * 32, facing: "right", inBoat: false });
  assert.match(source, /const drawMapV17=drawMap/);
  assert.match(source, /BOATS\.filter\(item=>item\.id!==selected\.id\)/);
});

test("v17 posiciona as linhas dos pescadores na água e as logos na borda verde", () => {
  for (const fisher of core.SHORE_FISHERS) {
    assert.equal(core.MAP[Math.floor(fisher.waterY / 32)]?.[Math.floor(fisher.waterX / 32)], "W");
  }
  for (const slot of core.SPONSOR_SLOTS) {
    assert.equal(core.MAP[Math.floor(slot.y / 32)]?.[Math.floor(slot.x / 32)], "T");
  }
  assert.match(source, /waterX=p\.waterX-p\.x,waterY=p\.waterY-p\.y/);
  assert.match(source, /SPONSOR_CACHE_KEY="ola_pesca_sponsors_v1"/);
  assert.match(source, /sponsors\.json\?ts=\$\{Date\.now\(\)\}/);
  assert.match(panel, /function fishingSponsorPaymentCurrent/);
  assert.match(panel, /await syncFishingSponsors\(\)/);
});

test("v17 converte força em até 100 metros e anima o voo da boia", () => {
  const player = { x: 7.5 * 32, y: 10.5 * 32, facing: "right", inBoat: false };
  assert.equal(core.castTarget({ player }, { dir: "right" }, 0.25).meters, 25);
  assert.equal(core.castTarget({ player }, { dir: "right" }, 0.5).meters, 50);
  assert.equal(core.castTarget({ player }, { dir: "right" }, 1).meters, 100);
  assert.equal(core.CAST_FLIGHT_DURATION, 1100);
  assert.match(source, /g\.mode="casting"/);
  assert.match(source, /function drawCastFlight/);
  assert.match(source, /Math\.sin\(progress\*Math\.PI\)\*82/);
  assert.match(source, /splashSound\(1\.1\)/);
});

test("v18 reposiciona a barra quando o pescador está na parte inferior", () => {
  assert.match(source, /function positionBattlePanel/);
  assert.match(source, /playerScreenY>g\.canvas\.height\*\.56/);
  assert.match(source, /classList\.toggle\("battle-top"/);
  assert.match(css, /\.pesca-battle\.battle-top\{top:10px;bottom:auto\}/);
});

test("v23 mantém uma imagem fixa por cliente e preserva suas imagens na modal", () => {
  const sponsors = core.normalizeFishingSponsors({
    loja: { name: "Loja", description: "Descrição breve", image: "logo.png", images: ["produto-a.png", "produto-b.png", "produto-a.png"] }
  });
  assert.deepEqual(Array.from(sponsors[0].images), ["logo.png", "produto-a.png", "produto-b.png"]);
  assert.equal(sponsors[0].description, "Descrição breve");
  assert.match(source, /function sponsorForSlot/);
  assert.doesNotMatch(source, /Math\.floor\(n\/7000\)%sources\.length/);
  assert.match(source, /function showSponsorThanks/);
  assert.match(source, /Conheça/);
  assert.match(source, /pesca-sponsor-description/);
  assert.match(source, /loading="lazy"/);
  assert.match(panel, /description: String\(client\.descricaoCurta \|\| client\.shortDescription/);
  assert.match(panel, /images: storyClientImages\(client\)\.slice\(0, 12\)/);
});

test("v23 distribui 20 anúncios e troca rodadas sem repetir antes de todos passarem", () => {
  assert.equal(core.SPONSOR_SLOTS.length, 20);
  assert.equal(core.SPONSOR_SLOTS.filter(slot => slot.x < 32).length, 5);
  assert.equal(core.SPONSOR_SLOTS.filter(slot => slot.x > 31 * 32).length, 5);
  assert.equal(core.SPONSOR_SLOTS.filter(slot => slot.y < 32).length, 5);
  assert.equal(core.SPONSOR_SLOTS.filter(slot => slot.y > 19 * 32).length, 5);
  const gameState = { sponsors: Array.from({ length: 45 }, (_, index) => ({ id: `c${index}`, image: `${index}.png` })) };
  const first = Array.from(core.updateSponsorRotation(gameState, 0, () => 0.42));
  assert.equal(first.length, 20);
  assert.deepEqual(Array.from(core.updateSponsorRotation(gameState, 59999, () => 0.42), item => item.id), first.map(item => item.id));
  const second = Array.from(core.updateSponsorRotation(gameState, 60000, () => 0.42));
  const third = Array.from(core.updateSponsorRotation(gameState, 120000, () => 0.42));
  assert.equal(second.length, 20);
  assert.equal(third.length, 5);
  assert.equal(new Set([...first, ...second, ...third].map(item => item.id)).size, 45);
  assert.match(source, /rotation\.nextAt=now\+60000/);
  assert.match(css, /\.pesca-sponsor-description/);
});

test("v25 amplia anúncios no mapa e mostra a imagem completa na modal", () => {
  assert.match(source, /function drawSponsorCover/);
  assert.match(source, /Math\.max\(innerW\/img\.naturalWidth,innerH\/img\.naturalHeight\)/);
  assert.match(source, /w=46,h=44/);
  assert.match(source, /strokeRect\(-25,-24,50,48\)/);
  assert.match(css, /\.pesca-sponsor-gallery img\{[^}]*height:auto/);
  assert.match(css, /\.pesca-sponsor-gallery img\{[^}]*object-fit:contain/);
  assert.match(css, /object-position:center/);
  assert.doesNotMatch(css, /\.pesca-sponsor-gallery figure\{[^}]*height:150px/);
});

test("v26 permite exemplares extraordinários acima do máximo comum", () => {
  assert.equal(core.EXTRAORDINARY_CHANCE, 0.0025);
  let extraordinary = null;
  for (let seed = 1; seed <= 20000 && !extraordinary; seed += 1) {
    const fish = core.generateFish(seed, core.SPOTS[3], 21);
    if (fish.extraordinary) extraordinary = fish;
  }
  assert.ok(extraordinary);
  const species = core.SPECIES.find(item => item.id === extraordinary.speciesId);
  assert.ok(extraordinary.length > species.maxL);
  assert.ok(extraordinary.length <= species.maximoBiologicoReferencia);
  assert.ok(extraordinary.weight <= core.biologicalMaxWeight(species));
  assert.equal(extraordinary.rarity, "LENDÁRIO");
  assert.equal(extraordinary.trophyClass, "MONSTRO");
  assert.equal(core.validateFishDimensions(extraordinary), true);
  assert.match(source, /1 em cada 400 peixes/);
  assert.match(source, /EXTRAORDINÁRIO/);
});

test("v26 registra e apresenta o Hall da Sorte do Tucunaré Dourado", () => {
  const rows = core.normalizeGoldenHall({
    ana: { name: "Ana", total: 1, bestWeight: 12, bestLength: 98, lastAt: 10 },
    bia: { name: "Bia", total: 2, bestWeight: 10, bestLength: 91, lastAt: 20 }
  });
  assert.deepEqual(Array.from(rows, item => item.name), ["Bia", "Ana"]);
  assert.match(source, /jogos\/olaPesca\/goldenHall\/\$\{localId\}/);
  assert.match(source, /ref\("jogos\/olaPesca\/goldenHall"\)\.once\("value"\)/);
  assert.match(source, /Hall da Sorte/);
  assert.match(source, /c\?\.speciesId!=="tucunare_dourado"/);
  assert.match(css, /\.pesca-golden-table/);
});

test("v18 adiciona fauna, reforça o casal de tucunarés e mostra horário no ranking", () => {
  assert.match(source, /function drawDuck/);
  assert.match(source, /function drawHeron/);
  assert.match(source, /function drawWildlife/);
  assert.match(source, /drawTucunareShadow=function/);
  assert.ok(source.includes("[-9,-3,4,11].forEach"));
  assert.match(source, /function rankingDateTime/);
  assert.match(source, /toLocaleTimeString\("pt-BR"/);
  assert.match(source, /Pescado em \$\{rankingDateTime/);
});

test("v19 explica a raridade por espécie e compartilha o jogo diretamente", () => {
  assert.match(source, /data-help-tab="rarity"/);
  assert.match(source, /mesma espécie/);
  assert.match(source, /até um lambari pode ser lendário/);
  assert.match(source, /data-share-game/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /url\.hash="#ola-pesca"/);
  assert.match(css, /\.pesca-help-tabs/);
});

test("v22 recolhe a linha acima de 10% e mantém o peixe na vara por 3 segundos", () => {
  const state = {
    cast: { power: 0.8, dir: "right", distance: 80, target: { x: 500, y: 200 } },
    battle: { pulls: 2, need: 4 },
    player: { x: 100, y: 200 }
  };
  assert.equal(core.queueReelStep(state), 40);
  core.updateReelAnimation(state, 360);
  assert.ok(state.cast.target.x < 500);
  state.cast.power = 0.11;
  state.cast.target = { x: 500, y: 200 };
  state.battle.pulls = 1;
  assert.equal(core.queueReelStep(state), 60);
  state.cast.power = 0.1;
  assert.equal(core.queueReelStep(state), null);
  assert.match(source, /cast\.power<=\.1/);
  assert.match(source, /remainingDistance/);
  assert.match(source, /const reeling=g\.mode==="battle"/);
  assert.match(source, /drawFightingFishV19\(c,g,n,q\)/);
  assert.match(source, /"NA BORDA!"/);
  assert.match(source, /setTimeout\(\(\)=>game===g&&g\.mode==="battle"&&caught\(g\),430\)/);
  assert.match(source, /Olha o peixe pendurado na vara!",2800/);
  assert.match(source, /showCatch\(g,captured\)\},3000/);
});

test("v22 apresenta imagens e convite do próprio comércio sem apoio ao jogo", () => {
  assert.match(source, /class="pesca-sponsor-gallery"/);
  assert.match(source, /sponsorSources\(entry\.item\)/);
  assert.match(source, /Conheça \$\{esc\(entry\.item\.name\)\} e prestigie o comércio local!/);
  assert.doesNotMatch(source, /APOIO AO PESQUE E SOLTE/);
  assert.match(css, /\.pesca-sponsor-gallery/);
});

test("v20 abre o cliente somente ao pressionar a ação diante do anúncio", () => {
  assert.match(source, /checkSponsorVisit=function\(g\)\{g\.nearSponsor=g\.mode==="explore"\?nearestSponsor\(g\):null\}/);
  assert.match(source, /const startChargeV20=startCharge/);
  assert.match(source, /if\(sponsor\)\{showSponsorThanks\(g,sponsor\);return\}/);
  assert.match(source, /APERTE A PARA CONHECER/);
  assert.match(source, /textContent="CONHECER"/);
  assert.match(source, /function drawSponsorActionBadge/);
  assert.match(source, /fillText\("A",18,-19\)/);
});

test("v21 carrega imagens externas e só usa texto depois de falha real", () => {
  assert.doesNotMatch(source, /crossOrigin="anonymous"/);
  assert.match(source, /img\.sponsorState="loading"/);
  assert.match(source, /img\.onload=\(\)=>\{img\.sponsorState="loaded"\}/);
  assert.match(source, /img\.onerror=\(\)=>\{img\.sponsorState="error"\}/);
  assert.match(source, /function preloadSponsorImages/);
  assert.match(source, /else if\(result\.loading\)drawSponsorLoading/);
  assert.deepEqual(
    Array.from(core.sponsorSources({ image: "logo.png", images: ["produto.png", "logo.png"] })),
    ["produto.png", "logo.png"]
  );
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
  assert.match(source, /rarity:extraordinary\?"LENDÁRIO":rarityBySize\(s,length,weight\)/);
});

test("v10 reproduz som de impacto quando a boia cai na água", () => {
  assert.match(source, /function splashSound\(delay=\.3\)/);
  assert.match(source, /createBuffer\(1,frames,a\.sampleRate\)/);
  assert.match(source, /if\(a\.state==="suspended"\)a\.resume\(\)/);
  assert.match(source, /filter\.type="lowpass"/);
  assert.match(source, /if\(g\.mode==="waiting"\)splashSound\(1\.1\)/);
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

test("v27 soma o maior comprimento de cada espécie no ranking", () => {
  const ranking = [{
    id: "ana",
    name: "Ana",
    speciesRecords: {
      piau: { speciesName: "Piau", length: 38, weight: 1.1, capturedAt: 10 },
      pacu: { speciesName: "Pacu", length: 72.5, weight: 9.2, capturedAt: 20 }
    }
  }, {
    id: "bia",
    name: "Bia",
    speciesId: "pintado", speciesName: "Pintado", bestLength: 100, bestWeight: 18, bestAt: 30
  }];
  const progress = [{ rankingPlayerId: "ana", playerName: "Ana", records: { piau: { length: 41, weight: 1.2, recordDate: "2026-09-24T10:00:00.000Z" } } }];
  const rows = core.mergeScoreRankingEntries(ranking, progress);
  assert.deepEqual(Array.from(rows, row => row.name), ["Ana", "Bia"]);
  assert.equal(rows[0].score, 113.5);
  assert.equal(rows[0].speciesCount, 2);
  assert.equal(rows[0].speciesRecords.piau.length, 41);
  assert.deepEqual({ ...core.rankingScore(rows[0].speciesRecords) }, { score: 113.5, speciesCount: 2, totalWeight: 10.4 });
});

test("v27 abre a coleção do jogador e explica a pontuação", () => {
  assert.match(source, /function openRankingProfile/);
  assert.match(source, /data-ranking-player/);
  assert.match(source, /1 cm = 1 ponto/);
  assert.match(source, /Como funciona o ranking/);
  assert.match(source, /jogos\/olaPesca\/users\.json/);
  assert.match(css, /\.pesca-ranking-profile-list/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("v28 normaliza campeonato, período e etapa ativa", () => {
  const config = core.normalizeFishingCompetitionConfig({
    freeRoundId: "rodada-2",
    championshipEnabled: true,
    showModeChoice: true,
    championship: {
      id: "copa",
      title: "Copa da Represa",
      startAt: 100,
      endAt: 500,
      stages: [
        { id: "final", name: "Final", startAt: 300, endAt: 500, prize: "Troféu" },
        { id: "classificatoria", name: "Classificatória", startAt: 100, endAt: 299, prize: "Kit pesca" }
      ]
    }
  });
  assert.equal(config.freeRoundId, "rodada-2");
  assert.deepEqual(Array.from(config.championship.stages, stage => stage.id), ["classificatoria", "final"]);
  assert.equal(core.championshipAvailable(config, 250), true);
  assert.equal(core.championshipAvailable(config, 600), false);
  assert.equal(core.activeFishingStage(config, 350).id, "final");
});

test("v28 separa rodada livre, campeonato e ranking das etapas", () => {
  assert.match(source, /data-mode-choice/);
  assert.match(source, /config\.showModeChoice&&config\.championshipEnabled/);
  assert.match(source, /Pesca Livre/);
  assert.match(source, /Campeonato/);
  assert.match(source, /championships\/"\+championship\.id/);
  assert.match(source, /"\/stages\/"\+stage\.id\+"\/ranking"/);
  assert.match(source, /roundId==="legacy"/);
  assert.match(source, /Cada modalidade possui seu próprio ranking/);
  assert.match(css, /\.pesca-mode-choice/);
  assert.match(css, /\.pesca-mode-badge/);
  assert.match(source, /ETAPA ATUAL/);
  assert.match(css, /\.pesca-stage-banner/);
});

test("v28 oferece ao Master campeonato, etapas, prêmios e nova rodada confirmada", () => {
  assert.match(panelHtml, /data-view="pescaConfig"/);
  assert.match(panelHtml, /id="fishingChampionshipForm"/);
  assert.match(panelHtml, /id="fishingStagesList"/);
  assert.match(panel, /Prêmio da etapa/);
  assert.match(panelHtml, /id="fishingResetRanking"/);
  assert.match(panel, /function saveFishingChampionship/);
  assert.match(panel, /function resetFishingFreeRanking/);
  assert.match(panel, /digite ZERAR/);
  assert.match(panel, /rankingArchives\//);
  assert.match(panel, /championships\//);
  assert.match(panelCss, /\.fishing-stage-row/);
  assert.match(panel, /numero: 820/);
  assert.match(panel, /label: "v827"/);
});

test("v29 preserva o mistério do Dourado e explica a pontuação do ranking", () => {
  assert.doesNotMatch(source, /Quem já encontrou o lendário Tucunaré Dourado na Pedra Dourada/);
  assert.doesNotMatch(source, /O primeiro sortudo ainda está pescando perto da pedra/);
  assert.match(source, /O lendário Tucunaré Dourado existe no jogo/);
  assert.match(source, /o próximo nome neste Hall da Sorte pode ser o seu/);
  assert.match(source, /A pontuação é a soma dos tamanhos dos peixes/);
  assert.match(css, /\.pesca-ranking-explanation/);
});

test("v30 destaca somente um jogador quando registros compartilham a mesma conta", () => {
  const rows = [
    { id: "jp-local", name: "JP", ownerUid: "conta-compartilhada" },
    { id: "bruno-local", name: "Bruno Fabro", ownerUid: "conta-compartilhada" }
  ];
  assert.equal(core.currentRankingPlayerId(rows, "bruno-local", "conta-compartilhada"), "bruno-local");
  assert.equal(core.currentRankingPlayerId(rows, "outro-navegador", "conta-compartilhada"), "jp-local");
  const selected = rows.filter(row => row.id === core.currentRankingPlayerId(rows, "bruno-local", "conta-compartilhada"));
  assert.equal(selected.length, 1);
  assert.equal(selected[0].name, "Bruno Fabro");
});

test("v31 preserva o nome digitado e reconhece códigos automáticos", () => {
  assert.equal(core.isGeneratedFishingName("Pescador GP7W"), true);
  assert.equal(core.isGeneratedFishingName("Maria Silva"), false);
  assert.equal(core.preferredFishingName("Maria Silva", "Pescador GP7W", "local-gp7w"), "Maria Silva");
  assert.equal(core.preferredFishingName("Pescador GP7W", "Maria Silva", "local-gp7w"), "Maria Silva");
  const rows = core.mergeScoreRankingEntries([{
    id: "local-gp7w", name: "Maria Silva", speciesRecords: { piau: { speciesName: "Piau", length: 38, weight: 1.1 } }
  }], [{
    rankingPlayerId: "local-gp7w", playerName: "Pescador GP7W", records: { piau: { length: 38, weight: 1.1 } }
  }]);
  assert.equal(rows[0].name, "Maria Silva");
  assert.match(source, /if\(ask&&\(!n\|\|isGeneratedFishingName\(n\)\)\)/);
});

test("v32 vira rosto e boné e oferece pistas falsas nos pescadores da margem", () => {
  assert.match(source, /facing==="right"\)c\.fillRect\(x\+5,y-14,8,3\)/);
  assert.match(source, /facing==="left"\)c\.fillRect\(x-13,y-14,8,3\)/);
  assert.match(source, /facing==="down"\)\{c\.fillRect\(x-4,y-10,2,2\)/);
  assert.equal(core.GOLDEN_FISHER_HINTS.length, core.SHORE_FISHERS.length);
  assert.match(core.GOLDEN_FISHER_HINTS.join(" "), /Todo pescador é mentiroso/);
  for (const hint of core.GOLDEN_FISHER_HINTS) assert.doesNotMatch(hint, /pedra|canto inferior|direito/i);
  assert.match(source, /function nearestShoreFisher/);
  assert.match(source, /APERTE A PARA OUVIR/);
  assert.match(source, /shoreFisherSpeech\(g,fisher\)/);
  assert.match(css, /\.pesca-message\.shore-fisher-speech/);
});

test("v33 eleva margens, adiciona goiabas e anima peixe grande distante", () => {
  assert.match(source, /function drawRaisedBanks/);
  assert.ok(new Set(Array.from({ length: 12 }, (_, index) => core.bankHeight(index, index % 5))).size > 1);
  assert.match(source, /for\(const\[fx,fy,r\]of\[\[-11,-2,3\]/);
  assert.equal(core.DISTANT_JUMP_POINTS.length, 6);
  const player = { player: { x: core.DISTANT_JUMP_POINTS[0].x, y: core.DISTANT_JUMP_POINTS[0].y } };
  const point = core.chooseDistantJumpPoint(player, () => 0);
  assert.ok(Math.hypot(point.x - player.player.x, point.y - player.player.y) >= 32 * 6);
  assert.match(source, /function drawDistantFishJump/);
  assert.match(source, /g\.player\.facing=Math\.abs\(dx\)>Math\.abs\(dy\)/);
  assert.match(source, /startled\?Math\.abs\(Math\.sin/);
});

test("v34 preserva o píer original e faz a garça cruzar o cenário", () => {
  assert.match(source, /MAP\[y\]\[x\]==="W"\|\|MAP\[y\]\[x\]==="P"/);
  assert.equal(core.HERON_ROUTES.length, 2);
  const route = core.HERON_ROUTES[0];
  const resting = core.heronFlightState(0, route);
  const flying = core.heronFlightState(29000, route);
  const landed = core.heronFlightState(33000, route);
  assert.equal(resting.flying, false);
  assert.equal(flying.flying, true);
  assert.equal(landed.flying, false);
  assert.ok(flying.x > route.from.x && flying.x < route.to.x);
  assert.equal(landed.x, route.to.x);
  assert.match(source, /function drawFlyingHeron/);
});

test("v35 oferece pistas verdadeiras, pato-guia e salto brilhante do Dourado", () => {
  const hints = core.GOLDEN_FISHER_HINTS.join(" ");
  assert.match(hints, /140 metros para leste/);
  assert.match(hints, /60 metros para o sul/);
  assert.match(hints, /margem sudeste/);
  assert.equal(core.DUCKS.filter(duck => duck.catchable).length, 1);
  const guide = core.DUCKS.find(duck => duck.catchable);
  const position = core.duckPosition(guide, 1000);
  assert.equal(core.guideDuckHit(position, 1000).duck, guide);
  assert.equal(core.guideDuckHit({ x: 0, y: 0 }, 1000), null);
  assert.match(source, /hitGuideDuck/);
  assert.match(source, /g\.fish\?\.isGuideDuck.*drawGuideDuckBody/);
  assert.match(source, /Você não pescou um pato/);
  assert.ok(source.includes("to:{...GUIDE_DUCK_PERCH}"));
  assert.match(source, /shadowColor="#ffd84d"/);
  assert.match(source, /BY[.]tucunare_dourado/);
  assert.match(css, /\.pesca-duck-catch/);
});

test("v36 usa a arte detalhada do Tucunaré Dourado no salto", () => {
  assert.ok(source.includes("s=BY.tucunare_dourado,img=fightingFishImage(s)"));
  assert.ok(source.includes("c.drawImage(img,-40,-20,80,40)"));
  assert.match(source, /createRadialGradient/);
  assert.match(source, /globalCompositeOperation="screen"/);
  assert.match(source, /const sweep=c.createLinearGradient/);
  assert.match(source, /droplet=Math.sin/);
});
test("v37 move o pato-guia livremente, amplia margens e adiciona luz noturna", () => {
  const guide = core.DUCKS.find(duck => duck.catchable);
  assert.equal(guide, core.DUCKS.reduce((top, duck) => duck.y < top.y ? duck : top));
  const before = core.duckPosition(guide, 99999);
  const after = core.duckPosition(guide, 100001);
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 2);
  assert.equal(source.includes("step=(n*.012"), false);
  assert.ok(source.includes("if(whiteEye){c.fillStyle="));
  assert.ok(source.includes("position.direction,duck.catchable,true,false"));
  assert.match(source, /returning:true/);
  assert.equal(core.MAP[5][28], "W");
  assert.equal(core.MAP[5][29], ".");
  assert.equal(core.MAP[5][30], ".");
  assert.ok(source.includes("distance<=T*1.1"));
  assert.equal(core.isNightHour(23), true);
  assert.equal(core.isNightHour(3), true);
  assert.equal(core.isNightHour(12), false);
  const lit = core.pierLightFishingTable({ jundia: 10, pintado: 8, traira: 6, corvina: 4, tilapia: 20 });
  assert.ok(lit.jundia > 10 && lit.pintado > 8 && lit.traira > 6 && lit.corvina > 4);
  const attracted = core.pierLightFishingTable({ tilapia: 20 });
  assert.ok(attracted.jundia > 0 && attracted.pintado > 0 && attracted.traira > 0 && attracted.corvina > 0);
  assert.equal(lit.tilapia, 20);
  assert.equal(core.nearPierLightSwitch({ mode: "explore", player: { x: core.PIER_LIGHT.switchX, y: core.PIER_LIGHT.switchY, inBoat: false } }), true);
  assert.match(source, /A PARA.*ACENDER/);
  assert.ok(source.includes("nearDock(g)||nearPierLightSwitch(g)"));
  assert.ok(source.includes("pierLightFishingTable(g.spot.table)"));
  assert.match(source, /Peixes noturnos estão se aproximando/);
});
test("v38 refina patos, casal, Dourado e recolhimento do guia", () => {
  assert.ok(core.PIER_LIGHT.switchX <= 7 * 32);
  assert.ok(core.PIER_LIGHT.switchY > 11 * 32);
  assert.ok(source.includes('strokeStyle="rgba(255,244,166,.72)"'));
  assert.ok(source.includes("[-13,-3,7].forEach"));
  assert.ok(source.includes("scale=index?.69:.76"));
  assert.match(source, /bezierCurveTo/);
  assert.equal(core.GUIDE_DUCK_PERCH.x, core.GOLDEN_ROCK.x);
  assert.ok(core.GUIDE_DUCK_PERCH.y < core.GOLDEN_ROCK.y);
  assert.ok(source.includes("drawGuideDuckBody(c,GUIDE_DUCK_PERCH.x,GUIDE_DUCK_PERCH.y"));
  assert.match(source, /function drawDetailedDuck/);
  assert.match(source, /body.addColorStop/);
  assert.ok(source.includes("drawGuideDuckBody(c,130,70,0,3.2"));
  const duckReel = {
    cast: { power: 0.08, target: { x: 320, y: 320 }, distance: 8, dir: "right" },
    battle: { pulls: 1, need: 4 },
    fish: { isGuideDuck: true },
    player: { x: 64, y: 64 }
  };
  assert.notEqual(core.queueReelStep(duckReel), null);
  assert.ok(duckReel.cast.reelAnimation.to.x < 320);
});
test("v39 posiciona o interruptor na margem, libera às 18h e comemora peixões", () => {
  const row = Math.floor(core.PIER_LIGHT.switchY / 32);
  const col = Math.floor(core.PIER_LIGHT.switchX / 32);
  assert.equal(core.PIER_LIGHT.switchX, 7 * 32);
  assert.equal(core.MAP[row][col], ".");
  assert.equal(core.MAP[row][col + 1], "W");
  assert.ok(Math.hypot(core.PIER_LIGHT.switchX - 7.5 * 32, core.PIER_LIGHT.switchY - 10.5 * 32) > 32);
  assert.equal(core.isNightHour(17), false);
  assert.equal(core.isNightHour(18), true);
  assert.equal(core.isNightHour(5), true);
  assert.equal(core.isNightHour(6), false);
  assert.ok(source.includes("FUNCIONA DAS 18H ÀS 6H"));
  assert.match(source, /function happyCatchSound/);
  assert.ok(source.includes('SpeechSynthesisUtterance("Uhul!")'));
  assert.ok(source.includes("if(captured.weight>10)happyCatchSound()"));
});
test("v40 adiciona pescadoras e compartilhamento de tucunaré lendário", () => {
  const women = core.SHORE_FISHERS.filter(fisher => fisher.gender === "woman");
  assert.equal(women.length, 2);
  assert.deepEqual(Array.from(women, fisher => fisher.color), ["#ef6fa8", "#f2c94c"]);
  assert.match(source, /p\.gender==="woman"/);
  assert.match(source, /data-share-legendary/);
  assert.match(source, /Compartilhar no Instagram/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /new File\(\[blob\]/);
  assert.match(source, /peixe mais raro e difícil de encontrar do jogo/);
  assert.match(source, /FEITO INCRÍVEL!/);
});

test("v40 libera o Braço Selvagem depois de um lendário", () => {
  assert.equal(core.TRIBUTARY_MAP.length, 20);
  assert.equal(core.TRIBUTARY_MAP[0].length, 32);
  assert.ok(core.TRIBUTARY_MAP.some(row => row.includes("C")));
  assert.ok(core.TRIBUTARY_MAP.some(row => row.includes("I")));
  assert.ok(core.TRIBUTARY_MAP.some(row => row.includes("P")));
  assert.equal(core.hasLegendaryAccess({ stats: { legendaryCaught: 1 }, captures: [] }), true);
  assert.equal(core.hasLegendaryAccess({ stats: {}, captures: [{ rarity: "LENDÁRIO" }] }), true);
  assert.equal(core.hasLegendaryAccess({ stats: {}, captures: [{ rarity: "ÉPICO" }] }), false);
  assert.ok(core.TRIBUTARY_SPOTS.current.table.dourado_rio > core.TRIBUTARY_SPOTS.river.table.dourado_rio);
  for (const spot of Object.values(core.TRIBUTARY_SPOTS)) {
    for (let seed = 1; seed <= 300; seed += 1) {
      const fish = core.generateFish(seed, spot, 14);
      assert.equal(core.validateFishDimensions(fish), true);
      assert.ok(Object.hasOwn(spot.table, fish.speciesId));
    }
  }
  const progress = core.emptyProgress();
  const legendary = core.generateFish(1234, core.TRIBUTARY_SPOTS.current, 14);
  legendary.rarity = "LENDÁRIO";
  const originalLocalStorage = context.localStorage;
  context.localStorage = { setItem() {} };
  core.captureFish(progress, legendary);
  assert.equal(progress.stats.legendaryCaught, 1);
  context.localStorage = originalLocalStorage;
  assert.equal(core.nearIslandDock({ zone: "tributario", mode: "explore", player: { x: core.ISLAND_DOCK.boatX, y: core.ISLAND_DOCK.boatY, inBoat: true } }), true);
  assert.equal(core.TRIBUTARY_MAP[Math.floor(core.ISLAND_DOCK.boatY / 32)][Math.floor(core.ISLAND_DOCK.boatX / 32)], "W");
  assert.equal(core.TRIBUTARY_GUESTS.length, 4);
  assert.ok(core.TRIBUTARY_GUESTS.every(guest => /!/.test(guest.joke)));
  assert.match(source, /function checkFishingMapTransition/);
  assert.match(source, /g\.player\.inBoat/);
  assert.match(source, /Ilha do Churrasco/);
  assert.match(source, /PEGUE 1 PEIXE LENDÁRIO/);
  assert.match(source, /Você desembarcou na Ilha do Churrasco/);
});
test("v41 mantém a lancha na ilha e impede sobreposição de barcos", () => {
  const obstacle = core.zoneBoatObstacles({ zone: "tributario" }, 0)[0];
  const gameState = { zone: "tributario", player: { inBoat: true } };
  assert.equal(core.boatObstacleCollision(gameState, obstacle.x, obstacle.y, 0), true);
  assert.equal(core.boatObstacleCollision(gameState, 2 * 32, 18 * 32, 0), false);
  assert.match(source, /g\.parkedBoat=\{x:g\.player\.x/);
  assert.match(source, /drawParkedPlayerBoat/);
  assert.match(source, /g\.parkedBoat=null/);
  assert.match(source, /blockedV41\(g,x,y\)\|\|boatObstacleCollision/);
});

test("v41 mantém a correnteza natural e leva ao mapa ampliado da ponte", () => {
  assert.equal(core.TRIBUTARY_MAP[3].at(-1), "C");
  assert.doesNotMatch(source, /fillText\("CORRENTEZA"/);
  assert.match(source, /tileType==="C"\?15:70/);
  assert.match(source, /function applyCurrentDrift/);
  assert.match(source, /dt\*\.012/);
  assert.equal(core.BRIDGE_MAP.length, 24);
  assert.equal(core.BRIDGE_MAP[0].length, 44);
  assert.equal(core.activeFishingMap({ zone: "ponte" }), core.BRIDGE_MAP);
  assert.match(source, /function enterBridgeMap/);
  assert.match(source, /passe por baixo dela/i);
});

test("v41 desenha tráfego e pescadores acima da lancha no Rio da Ponte", () => {
  assert.equal(core.BRIDGE_BOATS.length, 5);
  const moving = core.BRIDGE_BOATS.find(item => item.range > 0);
  const before = core.bridgeBoatPosition(moving, 0);
  const after = core.bridgeBoatPosition(moving, 10000);
  assert.notEqual(before.x, after.x);
  assert.match(source, /drawPlayer=function\(c,g,n,cam\)\{drawPlayerV41\(c,g,n,cam\);if\(g\.zone==="ponte"\)drawBridgeDeck\(c,g,n,cam\)\}/);
  assert.match(source, /drawBridgeFisher/);
  assert.match(source, /function drawBridgeCar/);
  assert.match(source, /function drawBridgeMotorcycle/);
  assert.match(source, /Todos os peixes dividem este grande rio/);
  assert.deepEqual(Object.keys(core.BRIDGE_SPOT.table).sort(), Array.from(core.SPECIES, fish => fish.id).sort());
  for (let seed = 1; seed <= 400; seed += 1) {
    const fish = core.generateFish(seed, core.BRIDGE_SPOT, 15);
    assert.equal(core.validateFishDimensions(fish), true);
  }
});
test("v42 aprimora o dourado, a ilha e o cenário aquático da ponte", () => {
  const riverGold = Array.from(core.SPECIES).find(fish => fish.id === "dourado_rio");
  assert.equal(riverGold.scientific, "Salminus brasiliensis");
  assert.equal(riverGold.image, "images/jogos/ola-pesca/dourado-rio-v42.png");
  assert.equal(core.TRIBUTARY_MAP[4][18], "C");
  assert.equal(core.TRIBUTARY_MAP[3].at(-1), "C");
  const islandBoats = core.zoneBoatObstacles({ zone: "tributario" }, 0);
  assert.deepEqual(Array.from(islandBoats, boat => boat.facing), ["left", "up"]);
  assert.doesNotMatch(source, /CANAL LIBERADO/);
  for (let y = 1; y < core.BRIDGE_ROWS - 1; y += 1) {
    for (let x = 1; x < core.BRIDGE_COLS - 1; x += 1) {
      assert.match(core.BRIDGE_MAP[y][x], /^[WC]$/);
    }
  }
  assert.match(source, /function drawBridgeCar/);
  assert.match(source, /function drawBridgeMotorcycle/);
  assert.ok(source.includes('const cars=[{offset:80,lane:28'));
  assert.ok(source.includes('{offset:510,lane:94'));
  assert.equal(source.includes('for(const offset of[40,310,590])'), false);
  assert.equal(source.includes('for(const offset of[170,480])'), false);
});
test("v43 reposiciona o pescador para fora do acesso da correnteza", () => {
  const fisher = core.SHORE_FISHERS[2];
  assert.equal(fisher.x, 29.05 * 32);
  assert.equal(fisher.y, 8.15 * 32);
  assert.equal(fisher.waterX, 28.55 * 32);
  assert.ok(fisher.y > 7 * 32);
  assert.equal(core.MAP[Math.floor(fisher.y / 32)][Math.floor(fisher.x / 32)], ".");
  assert.equal(core.MAP[Math.floor(fisher.waterY / 32)][Math.floor(fisher.waterX / 32)], "W");
});
test("v44 restringe a galhada ao mapa principal e prepara o compartilhamento lendário", () => {
  assert.equal(core.isMainReservoir({ zone: "represa" }), true);
  assert.equal(core.isMainReservoir({}), true);
  assert.equal(core.isMainReservoir({ zone: "tributario" }), false);
  assert.equal(core.isMainReservoir({ zone: "ponte" }), false);
  assert.ok(source.includes('g.player.inBoat&&isMainReservoir(g)&&(Math.hypot(x-SNAG.x'));
  assert.ok(source.includes('nearSnag=isMainReservoir(g)&&Math.hypot(target.x-SNAG.x'));
  assert.match(source, /data-share-legendary disabled/);
  assert.match(source, /Preparando compartilhamento/);
  assert.match(source, /prepareLegendaryShare\(capture\)\.then/);
  assert.match(source, /navigator\.share\(shareData\)\.catch/);
  assert.match(source, /fallbackLegendaryShare/);
  assert.doesNotMatch(source, /async function shareLegendaryCatch/);
});
test("v45 identifica o mapa, preserva a lancha e cria o matinho dos grandões", () => {
  assert.equal(core.FISHING_MAP_VERSION, 45);
  assert.match(source, /pesca-help-version/);
  assert.match(source, /mapa versão/);
  assert.match(css, /\.pesca-help-version small/);
  assert.ok(source.includes('docked=isMainReservoir(game)&&Math.hypot(x-BOATS[1].x'));
  assert.equal(core.TRIBUTARY_ISLAND_TREES.length, 3);
  assert.match(source, /TRIBUTARY_ISLAND_TREES\.forEach/);
  assert.equal(core.TRIBUTARY_BIG_GRASS.spot.minimumWeight, 6);
  assert.ok(core.TRIBUTARY_BIG_GRASS.x < 5 * 32);
  assert.ok(core.TRIBUTARY_BIG_GRASS.y < 5 * 32);
  assert.equal(core.isTributaryBigGrass({ x: core.TRIBUTARY_BIG_GRASS.x, y: core.TRIBUTARY_BIG_GRASS.y }), true);
  assert.equal(core.isTributaryBigGrass({ x: 15 * 32, y: 10 * 32 }), false);
  for (let seed = 1; seed <= 500; seed += 1) {
    const fish = core.generateFish(seed, core.TRIBUTARY_BIG_GRASS.spot, 15);
    assert.ok(fish.weight > 6);
    assert.equal(core.validateFishDimensions(fish), true);
  }
});
test("v28 protege configurações e arquivos do ranking para o Master", () => {
  const fishingRules = rules.rules.jogos.olaPesca;
  assert.match(fishingRules.config[".write"], /master/);
  assert.match(fishingRules.rankingArchives[".write"], /master/);
  assert.equal(fishingRules.ranking[".write"], true);
  assert.equal(fishingRules.championships.$championshipId.participants[".write"], true);
  assert.equal(fishingRules.championships.$championshipId.ranking[".write"], true);
  assert.equal(fishingRules.championships.$championshipId.stages.$stageId.ranking[".write"], true);
});