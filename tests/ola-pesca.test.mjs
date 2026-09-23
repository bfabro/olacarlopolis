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

test("Olá Pesca integra mapa, controles e progresso na tela de Jogos", () => {
  assert.match(html, /ola-pesca\.css\?v=2/);
  assert.match(html, /ola-pesca\.js\?v=2/);
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

test("catálogo inicial possui as 11 espécies e limites separados", () => {
  assert.equal(core.SPECIES.length, 11);
  assert.deepEqual(Array.from(core.SPECIES, item => item.id), ["lambari", "tilapia", "piau", "pacu", "traira", "curimbata", "carpa", "jundia", "pintado", "corvina", "tucunare"]);
  for (const item of core.SPECIES) {
    assert.ok(item.maximoBiologicoReferencia >= item.maximoJogavel);
    assert.ok(item.maxW > item.minW);
  }
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
