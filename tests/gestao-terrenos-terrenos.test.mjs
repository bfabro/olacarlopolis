import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainRecord,
  filterTerrains,
  terrainCharacteristicLabels,
  terrainMapsUrl,
  terrainStatusMeta
} from "../admin/gestao-terrenos-schema.js";

const baseInput = {
  owner_id: "",
  development_id: "",
  apelido: "Terreno da esquina",
  bairro: "Centro",
  rua: "Rua das Flores",
  numero: "100",
  quadra: "A",
  lote: "12",
  area_m2: "450,5",
  frente_m: "15",
  fundo_m: "30",
  matricula: "",
  inscricao_imobiliaria: "",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  observacoes: "Acesso pelo portão lateral.",
  grau_dificuldade: "medio",
  altura_mato: "de_30_a_60_cm",
  caracteristicas: ["pedras", "declive"],
  status: "monitorar"
};

test("cria terreno sem proprietário ou loteamento", () => {
  const terrain = buildTerrainRecord(baseInput, { id: "terrain-1", timestamp: 1000 });
  assert.equal(terrain.id, "terrain-1");
  assert.equal(terrain.owner_id, null);
  assert.equal(terrain.development_id, null);
  assert.equal(terrain.area_m2, 450.5);
  assert.deepEqual(terrain.caracteristicas, { pedras: true, declive: true });
});

test("rejeita medidas obrigatórias vazias", () => {
  assert.throws(
    () => buildTerrainRecord({ ...baseInput, area_m2: "" }, { id: "terrain-1", timestamp: 1000 }),
    /Valor inválido para área/
  );
});

test("cria terreno com os relacionamentos existentes", () => {
  const terrain = buildTerrainRecord(
    { ...baseInput, owner_id: "owner-1", development_id: "dev-1" },
    { id: "terrain-2", timestamp: 1000 }
  );
  assert.equal(terrain.owner_id, "owner-1");
  assert.equal(terrain.development_id, "dev-1");
});

test("edita preservando a data de criação", () => {
  const existing = buildTerrainRecord(baseInput, { id: "terrain-1", timestamp: 1000 });
  existing.oportunidade_nao_precisa_ate = "2026-10-01";
  const edited = buildTerrainRecord(
    { ...baseInput, lote: "13", status: "precisa_limpeza" },
    { id: "terrain-1", existing, timestamp: 2000 }
  );
  assert.equal(edited.lote, "13");
  assert.equal(edited.status, "precisa_limpeza");
  assert.equal(edited.created_at, 1000);
  assert.equal(edited.updated_at, 2000);
  assert.equal(edited.oportunidade_nao_precisa_ate, "2026-10-01");
});

test("pesquisa e combina todos os filtros da listagem", () => {
  const records = {
    a: buildTerrainRecord(
      { ...baseInput, owner_id: "owner-1", development_id: "dev-1" },
      { id: "a", timestamp: 1 }
    ),
    b: buildTerrainRecord(
      { ...baseInput, apelido: "Terreno norte", bairro: "Vista Alegre", quadra: "B", lote: "7", status: "limpo" },
      { id: "b", timestamp: 1 }
    )
  };
  const owners = { "owner-1": { id: "owner-1", nome: "Maria Silva" } };
  const developments = { "dev-1": { id: "dev-1", nome: "Jardim Primavera" } };
  assert.deepEqual(filterTerrains(records, { search: "maria" }, owners, developments).map((item) => item.id), ["a"]);
  assert.deepEqual(filterTerrains(records, { search: "primavera" }, owners, developments).map((item) => item.id), ["a"]);
  assert.deepEqual(filterTerrains(records, {
    owner_id: "owner-1",
    development_id: "dev-1",
    bairro: "Centro",
    status: "monitorar",
    quadra: "A",
    lote: "12"
  }, owners, developments).map((item) => item.id), ["a"]);
});

test("inativação mantém o cadastro e produz status conhecido", () => {
  const existing = buildTerrainRecord(baseInput, { id: "terrain-1", timestamp: 1 });
  const inactive = buildTerrainRecord(
    { ...existing, status: "inativo" },
    { id: "terrain-1", existing, timestamp: 2 }
  );
  assert.equal(inactive.status, "inativo");
  assert.equal(inactive.apelido, existing.apelido);
  assert.equal(terrainStatusMeta(inactive.status).label, "Inativo");
});

test("gera link do Maps por URL ou coordenadas", () => {
  assert.equal(
    terrainMapsUrl({ google_maps_url: "https://maps.google.com/example" }),
    "https://maps.google.com/example"
  );
  assert.equal(
    terrainMapsUrl({ latitude: -23.426, longitude: -49.72 }),
    "https://www.google.com/maps?q=-23.426,-49.72"
  );
  assert.equal(terrainMapsUrl({ latitude: "", longitude: "" }), "");
});

test("traduz somente características selecionadas", () => {
  assert.deepEqual(
    terrainCharacteristicLabels({ entulho: true, acesso_dificil: true, outro: false }),
    ["Entulho", "Acesso difícil"]
  );
});
