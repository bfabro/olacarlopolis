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

test("GPS explicito preenche endereco e preserva mapa com direcao", () => {
  assert.match(panelHtml, /Marcar localização exata com GPS/);
  assert.match(panelHtml, /id="terrainQuickMapFrame"/);
  assert.match(panelHtml, /id="terrainQuickMapMarker"/);
  assert.match(panelJs, /nominatim\.openstreetmap\.org\/reverse/);
  assert.match(panelJs, /terrainMapEmbedUrl/);
  assert.match(panelJs, /DeviceOrientationEvent/);
  assert.match(panelJs, /direcao_graus/);
  assert.match(panelJs, /found\.street/);
  assert.doesNotMatch(panelJs.slice(panelJs.indexOf("function openTerrainQuickForm"), panelJs.indexOf("function renderTerrainQuickAccess")), /useCurrentTerrainQuickLocation\(\)/);
  assert.match(panelCss, /\.terrain-location-map-marker/);
});

test("cadastro rapido mostra situacao em grade visual", () => {
  assert.match(panelHtml, /name="terrainQuickStatus" value="proprietario_desconhecido" checked/);
  assert.match(panelHtml, /name="terrainQuickStatus" value="precisa_limpeza"/);
  assert.match(panelJs, /input\[name="terrainQuickStatus"\]:checked/);
  assert.match(panelCss, /\.terrain-quick-status-grid/);
});

test("salvamento aguarda o GPS e a previa libera a URL sem JavaScript inline", () => {
  assert.match(panelHtml, /id="terrainQuickSave"/);
  assert.match(panelJs, /terrainQuickLocationPending/);
  assert.match(panelJs, /saveButton\.disabled = terrainQuickLocationPending/);
  assert.match(panelJs, /Aguarde o GPS e a busca do endereço terminarem/);
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

test("prospeccao pode ser excluida junto com fotos e timeline sem apagar historicos protegidos", () => {
  assert.match(panelJs, /data-terrain-delete=.*data-no-loading/);
  assert.match(panelJs, /Excluir prospecção/);
  assert.match(panelJs, /prospecção e todas as suas fotos/);
  assert.match(panelJs, /hasProtectedRemoteRecords = snapshots\.slice\(1, 4\)/);
  assert.match(panelJs, /photosToDelete\.forEach/);
  assert.match(panelJs, /deleteTerrainDevelopmentStoragePath\(photo\.path\)/);
  assert.match(panelJs, /Prospecção e fotos excluídas/);
});

test("aba Terrenos prioriza cadastro e tabela recolhida", () => {
  const terrainSection = panelHtml.slice(panelHtml.indexOf('data-terrain-section="terrains"'), panelHtml.indexOf('data-terrain-section="developments"'));
  assert.ok(terrainSection.indexOf('id="newTerrain"') < terrainSection.indexOf('id="terrainList"'));
  assert.match(terrainSection, /Adicionar novo terreno/);
  assert.match(terrainSection, /id="terrainTableContent" class="terrain-table-content hidden"/);
  assert.match(panelJs, /setTerrainTableExpanded\(false\)/);
  assert.match(panelCss, /\.terrain-list-card \{ order: 1; \}/);
  assert.match(panelCss, /\.terrain-form-card \{ order: 2; \}/);
  assert.match(terrainSection, /terrain-filter-panel/);
  assert.match(terrainSection, /id="terrainReferenceCounter"/);
});

test("cadastro de terreno permite informações parciais e gera referência", () => {
  const terrainForm = panelHtml.slice(panelHtml.indexOf('id="terrainForm"'), panelHtml.indexOf("</form>", panelHtml.indexOf('id="terrainForm"')));
  assert.match(terrainForm, /id="terrainReferenceCode" readonly/);
  ["terrainNickname", "terrainNeighborhood", "terrainStreet", "terrainNumber", "terrainBlock", "terrainLot", "terrainArea", "terrainFront", "terrainBack", "terrainDifficulty", "terrainGrassHeight", "terrainStatus"].forEach((id) => {
    assert.doesNotMatch(terrainForm, new RegExp(`id="${id}"[^>]*\\srequired(?:\\s|>)`));
  });
  assert.match(panelJs, /function nextTerrainReferenceCode/);
  assert.match(panelJs, /values\.apelido = values\.apelido \|\| values\.codigo_referencia/);
});

test("detalhe mostra vínculos e permite desvincular preservando histórico", () => {
  assert.match(panelJs, /function terrainLinkedDataHtml/);
  assert.match(panelJs, /data-terrain-unlink-kind/);
  assert.match(panelJs, /function unlinkTerrainLinkedRecord/);
  assert.match(panelJs, /TERRAIN_UNLINK_ARCHIVE_ID/);
  assert.match(panelJs, /terreno_desvinculado_codigo/);
  assert.match(panelCss, /\.terrain-linked-data-section/);
  const unlinkStart = panelJs.indexOf("async function unlinkTerrainLinkedRecord");
  const unlinkFlow = panelJs.slice(unlinkStart, panelJs.indexOf("async function deleteTerrain(", unlinkStart));
  assert.ok(unlinkFlow.indexOf("await firebaseSet(archiveRef") < unlinkFlow.indexOf("await firebaseUpdate(ref(db), updates)"));
  assert.doesNotMatch(unlinkFlow, /updates\[.*TERRAIN_UNLINK_ARCHIVE_ID.*\] = \{/);
});

test("galeria do terreno preserva fotos e botoes sem cortes", () => {
  assert.match(panelCss, /\.terrain-detail-upload-bar \{[\s\S]*display: flex;[\s\S]*flex-wrap: wrap;/);
  assert.match(panelCss, /\.terrain-photo-gallery \{[\s\S]*repeat\(auto-fill, minmax\(min\(180px, 100%\), 1fr\)\)/);
  assert.match(panelCss, /\.terrain-photo-card \{[\s\S]*margin: 0;/);
  assert.match(panelCss, /\.terrain-photo-card figcaption \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(panelCss, /\.terrain-photo-card-actions \{[\s\S]*flex: 0 0 auto;/);
});

test("detalhe do terreno mostra data e histórico completo de serviços", () => {
  assert.match(panelJs, /function terrainServiceHistoryRecords/);
  assert.match(panelJs, /service\.terrain_id === terrainId \|\| service\.terreno_desvinculado_id === terrainId/);
  assert.match(panelJs, /Data do serviço mais recente/);
  assert.match(panelJs, /Serviços deste terreno/);
  assert.match(panelJs, /data-terrain-service-view/);
  assert.match(panelCss, /\.terrain-service-history-section/);
  assert.match(panelCss, /\.terrain-service-history-details/);
});

test("terrenos podem ser ativados desativados e excluidos com suas fotos", () => {
  assert.match(panelJs, /function toggleTerrainActiveState/);
  assert.match(panelJs, /data-terrain-toggle-active/);
  assert.match(panelJs, /Terreno ativado/);
  assert.match(panelJs, /Terreno desativado/);
  assert.doesNotMatch(panelJs, /hasBlockingRemotePhotos/);
  assert.match(panelJs, /Terreno e fotos excluídos/);
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
  assert.match(terrainRules.direcao_graus[".validate"], /newData\.val\(\) <= 360/);
  assert.match(terrainRules.capturado_em[".validate"], /newData\.isNumber/);
});

test("ativos e versoes do novo fluxo evitam cache antigo", () => {
  assert.match(panelHtml, /painel\.css\?v=452/);
  assert.match(panelHtml, /painel\.js\?v=681/);
  assert.match(panelJs, /gestao-terrenos-schema\.js\?v=24/);
  assert.match(panelJs, /numero: 744/);
  assert.match(panelJs, /label: "v751"/);
});
