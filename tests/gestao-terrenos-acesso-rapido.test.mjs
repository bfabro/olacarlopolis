import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTerrainRecord } from "../admin/gestao-terrenos-schema.js";

const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");
const databaseRules = JSON.parse(readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));

const quickInput = {
  cadastro_rapido: true,
  apelido: "Terreno ao lado do mercado",
  bairro: "",
  rua: "",
  numero: "",
  quadra: "",
  lote: "",
  area_m2: "",
  frente_m: "",
  fundo_m: "",
  latitude: -23.426,
  longitude: -49.72,
  google_maps_url: "https://www.google.com/maps?q=-23.426,-49.72",
  localizacao_referencia: "Ao lado do mercado",
  precisao_gps_m: 8,
  observacoes: "Mato alto.",
  grau_dificuldade: "nao_informado",
  altura_mato: "acima_1_m",
  status: "precisa_limpeza"
};

test("acesso rapido e a primeira tela da Gestao de Terrenos", () => {
  assert.match(panelHtml, /class="active" data-terrain-tab="quick"/);
  assert.match(panelHtml, /data-terrain-section="quick"/);
  assert.match(panelJs, /switchTerrainManagementTab\("quick"\)/);
  assert.match(panelJs, /const allowedTabs = new Set\(\["quick", "dashboard"/);
});

test("captura em campo oferece GPS camera referencia e observacoes", () => {
  assert.match(panelHtml, /id="terrainQuickUseLocation"/);
  assert.match(panelHtml, /id="terrainQuickPhotos"[^>]*capture="environment"/);
  assert.match(panelHtml, /id="terrainQuickReference"/);
  assert.match(panelHtml, /id="terrainQuickNotes"/);
  assert.match(panelJs, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(panelJs, /enableHighAccuracy: true/);
  assert.match(panelJs, /uploadTerrainGeneralPhotos\(terrainId, files, "frente"\)/);
});

test("salvamento aguarda o GPS e a previa libera a URL sem JavaScript inline", () => {
  assert.match(panelHtml, /id="terrainQuickSave"/);
  assert.match(panelJs, /terrainQuickLocationPending/);
  assert.match(panelJs, /hasManualReference/);
  assert.match(panelJs, /Aguardando GPS/);
  assert.match(panelJs, /window\.URL\.revokeObjectURL/);
  assert.doesNotMatch(panelJs, /onload="URL\.revokeObjectURL/);
});

test("salvamento concluido nao vira erro quando apenas a atualizacao da tela falha", () => {
  assert.match(panelJs, /if \(databaseSaved\) \{/);
  assert.match(panelJs, /Prospecção salva com sucesso\. Atualize a tela/);
  assert.match(panelJs, /Index not defined/);
  assert.match(panelJs, /usando leitura de compatibilidade/);
});

test("prospeccao aceita dados minimos com GPS e preserva precisao", () => {
  const terrain = buildTerrainRecord(quickInput, { id: "quick-1", timestamp: 1000 });
  assert.equal(terrain.cadastro_rapido, true);
  assert.equal(terrain.prospeccao_status, "pendente_dados");
  assert.equal(terrain.area_m2, 0);
  assert.equal(terrain.grau_dificuldade, "nao_informado");
  assert.equal(terrain.precisao_gps_m, 8);
  assert.equal(terrain.capturado_em, 1000);
});

test("referencia manual substitui GPS mas uma localizacao continua obrigatoria", () => {
  const manual = buildTerrainRecord({
    ...quickInput,
    latitude: "",
    longitude: "",
    google_maps_url: "",
    localizacao_referencia: "Rua das Flores, depois da esquina"
  }, { id: "quick-2", timestamp: 2000 });
  assert.equal(manual.latitude, null);
  assert.equal(manual.localizacao_referencia, "Rua das Flores, depois da esquina");
  assert.throws(() => buildTerrainRecord({
    ...quickInput,
    latitude: "",
    longitude: "",
    localizacao_referencia: ""
  }, { id: "quick-3", timestamp: 3000 }), /GPS ou informe um ponto de referencia/);
});

test("cadastro completo remove automaticamente a pendencia da prospeccao", () => {
  const quick = buildTerrainRecord(quickInput, { id: "quick-1", timestamp: 1000 });
  const complete = buildTerrainRecord({
    ...quickInput,
    cadastro_rapido: false,
    bairro: "Centro",
    rua: "Rua Um",
    numero: "10",
    quadra: "A",
    lote: "2",
    area_m2: 300,
    frente_m: 10,
    fundo_m: 30,
    grau_dificuldade: "medio",
    altura_mato: "de_30_a_60_cm"
  }, { id: "quick-1", existing: quick, timestamp: 4000 });
  assert.equal("cadastro_rapido" in complete, false);
  assert.equal("prospeccao_status" in complete, false);
  assert.equal("capturado_em" in complete, false);
});

test("consulta rapida destaca pendentes e abre o cadastro existente", () => {
  assert.match(panelHtml, /id="openTerrainQuickSearch"/);
  assert.match(panelHtml, /id="terrainQuickRecentList"/);
  assert.match(panelJs, /data-terrain-quick-view/);
  assert.match(panelJs, /terrain-quick-badge/);
  assert.match(panelJs, /terrain\.cadastro_rapido \? "A confirmar"/);
  assert.match(panelCss, /\.terrain-quick-actions[\s\S]*grid-template-columns: repeat\(2/);
  assert.match(panelCss, /@media \(max-width: 680px\)[\s\S]*\.terrain-quick-actions \{ grid-template-columns: 1fr/);
});

test("regras do Firebase aceitam e validam os campos da prospeccao", () => {
  const terrainRules = databaseRules.rules.terrenos.$terrainId;
  assert.match(terrainRules[".validate"], /nao_informado/);
  assert.equal(terrainRules.cadastro_rapido[".validate"], "!newData.exists() || newData.isBoolean()");
  assert.match(terrainRules.precisao_gps_m[".validate"], /newData\.isNumber/);
  assert.match(terrainRules.capturado_em[".validate"], /newData\.isNumber/);
});

test("ativos e versoes do novo fluxo evitam cache antigo", () => {
  assert.match(panelHtml, /painel\.css\?v=447/);
  assert.match(panelHtml, /painel\.js\?v=673/);
  assert.match(panelJs, /gestao-terrenos-schema\.js\?v=22/);
  assert.match(panelJs, /numero: 736/);
  assert.match(panelJs, /label: "v743"/);
});
