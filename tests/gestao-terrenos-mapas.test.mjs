import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TERRAIN_INTERACTIVE_MAPS,
  buildTerrainInteractiveSelection,
  mergeTerrainInteractiveDevelopments,
  terrainInteractiveLotMeasurements,
  terrainInteractiveLotNumbers,
  terrainInteractiveMapForDevelopment,
  terrainInteractiveMapsForNeighborhood
} from "../admin/gestao-terrenos-mapas.js";
import {
  terrainInteractiveHotspotNear,
  terrainInteractiveHotspots
} from "../admin/gestao-terrenos-hotspots.js";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("mantem cada loteamento em um mapa separado", () => {
  assert.deepEqual(TERRAIN_INTERACTIVE_MAPS.map((map) => map.id), [
    "novo-horizonte-i",
    "novo-horizonte-ii",
    "novo-horizonte-iii",
    "vila-ray"
  ]);
  TERRAIN_INTERACTIVE_MAPS.forEach((map) => {
    assert.ok(map.blocks.length > 0);
    assert.ok(existsSync(`${workspace}/admin/${map.image.replace("./", "")}`));
  });
});

test("associa loteamento previamente cadastrado por nome", () => {
  assert.equal(
    terrainInteractiveMapForDevelopment({ nome: "Loteamento Residencial Novo Horizonte II" })?.id,
    "novo-horizonte-ii"
  );
  assert.equal(terrainInteractiveMapForDevelopment({ nome: "Residencial Vila Ray" })?.id, "vila-ray");
  assert.equal(
    terrainInteractiveMapForDevelopment({ id: "mapa-interativo-novo-horizonte-iii", nome: "Nome personalizado" })?.id,
    "novo-horizonte-iii"
  );
});

test("publica mapas como loteamentos sem duplicar cadastros existentes", () => {
  const existing = {
    amaral: { id: "amaral", nome: "Amaral 1", bairro: "Centro" },
    horizonte: { id: "horizonte", nome: "Loteamento Residencial Novo Horizonte I", bairro: "Novo Horizonte" }
  };
  const merged = mergeTerrainInteractiveDevelopments(existing, 1234);
  assert.equal(Object.keys(merged.developments).length, 5);
  assert.equal(Object.keys(merged.created).length, 3);
  assert.equal(merged.developments.horizonte.nome, "Loteamento Residencial Novo Horizonte I");
  assert.equal(merged.developments["mapa-interativo-novo-horizonte-ii"].mapa_interativo_id, "novo-horizonte-ii");
  assert.equal(merged.developments["mapa-interativo-novo-horizonte-iii"].cidade, "Carlópolis");
  assert.equal(merged.developments["mapa-interativo-vila-ray"].origem, "mapa_interativo");
});

test("painel sincroniza loteamentos dos mapas com todas as listas", () => {
  assert.match(panelJs, /gestao-terrenos-mapas\.js\?v=4/);
  assert.match(panelJs, /mergeTerrainInteractiveDevelopments/);
  assert.match(panelJs, /interactiveDevelopmentUpdates/);
  assert.match(panelJs, /developments: interactiveDevelopments\.developments/);
});

test("retorna area e medidas exatas quando identificadas na planta", () => {
  assert.deepEqual(terrainInteractiveLotMeasurements("novo-horizonte-i", "C", "1"), { areaM2: 234, frontM: 13, backM: 18 });
  assert.deepEqual(terrainInteractiveLotMeasurements("novo-horizonte-i", "C", "2"), { areaM2: 180, frontM: 10, backM: 18 });
  assert.deepEqual(terrainInteractiveLotMeasurements("novo-horizonte-ii", "B", "2"), { areaM2: 198, frontM: 11, backM: 18 });
  assert.equal(buildTerrainInteractiveSelection("novo-horizonte-iii", "M", "1").areaM2, 329.97);
  assert.equal(terrainInteractiveLotMeasurements("novo-horizonte-i", "Q", "1"), null);
  const regularBlockTotal = terrainInteractiveLotNumbers("novo-horizonte-i", "C")
    .reduce((total, lot) => total + terrainInteractiveLotMeasurements("novo-horizonte-i", "C", lot).areaM2, 0);
  assert.equal(regularBlockTotal, 4536);
  const horizonTwoBlockTotal = terrainInteractiveLotNumbers("novo-horizonte-ii", "B")
    .reduce((total, lot) => total + terrainInteractiveLotMeasurements("novo-horizonte-ii", "B", lot).areaM2, 0);
  assert.equal(horizonTwoBlockTotal, 4266);
});

test("localiza todas as plantas disponíveis para o bairro selecionado", () => {
  const developments = mergeTerrainInteractiveDevelopments({}, 1234).developments;
  assert.deepEqual(
    terrainInteractiveMapsForNeighborhood(developments, "Novo Horizonte").map((item) => item.map.id),
    ["novo-horizonte-i", "novo-horizonte-ii", "novo-horizonte-iii"]
  );
  assert.deepEqual(
    terrainInteractiveMapsForNeighborhood(developments, "Vila Ray").map((item) => item.map.id),
    ["vila-ray"]
  );
  assert.deepEqual(terrainInteractiveMapsForNeighborhood(developments, "Centro"), []);
});

test("nao oferece areas institucionais como lotes numerados", () => {
  assert.deepEqual(terrainInteractiveLotNumbers("novo-horizonte-i", "A").slice(0, 2), ["2", "3"]);
  assert.equal(terrainInteractiveLotNumbers("novo-horizonte-i", "A").at(-1), "13");
  assert.deepEqual(terrainInteractiveLotNumbers("novo-horizonte-i", "S"), ["3", "4", "5", "6"]);
  assert.equal(terrainInteractiveLotNumbers("novo-horizonte-ii", "A")[0], "2");
});

test("prepara a referencia para o Cadastro Rapido", () => {
  const selection = buildTerrainInteractiveSelection("novo-horizonte-iii", "B", "7");
  assert.equal(selection.neighborhood, "Novo Horizonte");
  assert.equal(selection.block, "B");
  assert.equal(selection.lot, "7");
  assert.match(selection.reference, /Novo Horizonte III · Quadra B · Lote 7/);
  assert.match(selection.street, /^Rua /);
});

test("interface permite marcar a planta e enviar os dados ao cadastro rapido", () => {
  assert.match(panelHtml, /id="terrainInteractiveMapStage"/);
  assert.match(panelHtml, /id="terrainInteractiveBlockSelect"/);
  assert.match(panelHtml, /id="terrainQuickNeighborhood"/);
  assert.match(panelHtml, /id="terrainQuickBlock"/);
  assert.match(panelHtml, /id="terrainQuickLot"/);
  assert.match(panelJs, /function markTerrainInteractiveMapPoint/);
  assert.match(panelJs, /function useTerrainInteractiveSelection/);
  assert.match(panelJs, /data-interactive-use-selection-gps/);
  assert.match(panelJs, /found\.street && !streetInput\.value\.trim\(\)/);
  assert.match(panelCss, /\.terrain-interactive-map-layout/);
  assert.match(panelCss, /\.terrain-interactive-map-pin/);
});

test("mapeia todos os lotes identificaveis dos tres Novo Horizonte", () => {
  assert.equal(terrainInteractiveHotspots("novo-horizonte-i").length, 390);
  assert.equal(terrainInteractiveHotspots("novo-horizonte-ii").length, 233);
  assert.equal(terrainInteractiveHotspots("novo-horizonte-iii").length, 281);
  assert.equal(terrainInteractiveHotspots("vila-ray").length, 0);
});

test("clique proximo ao numero identifica quadra e lote", () => {
  const hotspot = terrainInteractiveHotspots("novo-horizonte-i").find((item) => item.block === "C" && item.lot === "7");
  assert.ok(hotspot);
  const identified = terrainInteractiveHotspotNear("novo-horizonte-i", hotspot.x + 0.1, hotspot.y + 0.05, 900, 1900);
  assert.equal(identified.block, "C");
  assert.equal(identified.lot, "7");
  assert.ok(identified.distance < 2);
  assert.equal(terrainInteractiveHotspotNear("vila-ray", 50, 50, 900, 600), null);
});

test("interface oferece zoom de 100 a 400 por cento", () => {
  assert.match(panelHtml, /id="terrainInteractiveZoomOut"/);
  assert.match(panelHtml, /id="terrainInteractiveZoomIn"/);
  assert.match(panelHtml, /id="terrainInteractiveZoomReset"/);
  assert.match(panelJs, /function setTerrainInteractiveMapZoom/);
  assert.match(panelJs, /Math\.max\(1, Math\.min\(4/);
  assert.match(panelCss, /\.terrain-interactive-map-toolbar/);
});
