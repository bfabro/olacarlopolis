import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainDevelopmentRecord,
  canDeleteTerrainDevelopment,
  clampTerrainPlanZoom,
  filterTerrainDevelopments,
  terrainDevelopmentPlanStoragePath,
  terrainDevelopmentLinkedTerrains,
  terrainDevelopmentPlanContext,
  validateTerrainDevelopmentPlanFile
} from "../admin/gestao-terrenos-schema.js";

const baseInput = {
  nome: "Jardim Primavera",
  bairro: "Vista Alegre",
  cidade: "Carlópolis",
  descricao: "Loteamento residencial.",
  observacoes: "Planta aprovada.",
  planta_imagem_url: "",
  planta_imagem_path: "",
  planta_pdf_url: "",
  planta_pdf_path: ""
};

test("cria loteamento sem arquivos opcionais", () => {
  const development = buildTerrainDevelopmentRecord(baseInput, { id: "dev-1", timestamp: 1000 });
  assert.equal(development.id, "dev-1");
  assert.equal(development.nome, "Jardim Primavera");
  assert.equal(development.planta_imagem_url, null);
  assert.equal(development.planta_pdf_url, null);
  assert.equal(development.created_at, 1000);
});

test("salva imagem e PDF da planta", () => {
  const development = buildTerrainDevelopmentRecord({
    ...baseInput,
    planta_imagem_url: "https://example.com/planta.jpg",
    planta_imagem_path: "gestao-terrenos/loteamentos/dev-1/imagem/planta.jpg",
    planta_pdf_url: "https://example.com/planta.pdf",
    planta_pdf_path: "gestao-terrenos/loteamentos/dev-1/pdf/planta.pdf"
  }, { id: "dev-1", timestamp: 1000 });
  assert.match(development.planta_imagem_path, /\/imagem\//);
  assert.match(development.planta_pdf_path, /\/pdf\//);
});

test("edita preservando a data de criação", () => {
  const existing = buildTerrainDevelopmentRecord(baseInput, { id: "dev-1", timestamp: 1000 });
  const edited = buildTerrainDevelopmentRecord(
    { ...baseInput, observacoes: "Planta revisada." },
    { id: "dev-1", existing, timestamp: 2000 }
  );
  assert.equal(edited.observacoes, "Planta revisada.");
  assert.equal(edited.created_at, 1000);
  assert.equal(edited.updated_at, 2000);
});

test("lista e pesquisa loteamentos", () => {
  const records = {
    b: buildTerrainDevelopmentRecord({ ...baseInput, nome: "Residencial Zênite" }, { id: "b", timestamp: 1 }),
    a: buildTerrainDevelopmentRecord(baseInput, { id: "a", timestamp: 1 })
  };
  assert.deepEqual(filterTerrainDevelopments(records).map((item) => item.id), ["a", "b"]);
  assert.deepEqual(filterTerrainDevelopments(records, "vista alegre").map((item) => item.id), ["a", "b"]);
  assert.deepEqual(filterTerrainDevelopments(records, "primavera").map((item) => item.id), ["a"]);
});

test("bloqueia exclusão quando há terrenos vinculados", () => {
  const terrains = {
    t1: { id: "t1", development_id: "dev-1", bairro: "Centro", quadra: "A", lote: "1" },
    t2: { id: "t2", development_id: "dev-2", bairro: "Centro", quadra: "B", lote: "2" }
  };
  assert.equal(terrainDevelopmentLinkedTerrains("dev-1", terrains).length, 1);
  assert.equal(canDeleteTerrainDevelopment("dev-1", terrains), false);
  assert.equal(canDeleteTerrainDevelopment("dev-3", terrains), true);
});

test("prepara contexto visual de loteamento, quadra, lote, terreno e proprietário", () => {
  const terrains = {
    t1: { id: "t1", development_id: "dev-1", owner_id: "owner-1", bairro: "Centro", quadra: "C", lote: "9" }
  };
  const owners = { "owner-1": { id: "owner-1", nome: "Maria Silva" } };
  assert.deepEqual(terrainDevelopmentPlanContext("dev-1", terrains, owners), [{
    development_id: "dev-1",
    terrain_id: "t1",
    quadra: "C",
    lote: "9",
    owner_id: "owner-1",
    owner_name: "Maria Silva"
  }]);
});

test("valida tipos e limites dos uploads", () => {
  assert.equal(validateTerrainDevelopmentPlanFile({
    name: "planta.webp",
    type: "image/webp",
    size: 1024
  }, "image"), true);
  assert.equal(validateTerrainDevelopmentPlanFile({
    name: "planta.pdf",
    type: "application/pdf",
    size: 2048
  }, "pdf"), true);
  assert.throws(
    () => validateTerrainDevelopmentPlanFile({ name: "planta.exe", type: "application/octet-stream", size: 100 }, "image"),
    /imagem válida/
  );
  assert.throws(
    () => validateTerrainDevelopmentPlanFile({ name: "planta.pdf", type: "application/pdf", size: 16 * 1024 * 1024 }, "pdf"),
    /15 MB/
  );
});

test("organiza uploads por loteamento e tipo de planta", () => {
  assert.equal(
    terrainDevelopmentPlanStoragePath("dev-1", {
      name: "Planta Geral.JPG",
      type: "image/jpeg",
      size: 1024
    }, "image", 123),
    "gestao-terrenos/loteamentos/dev-1/imagem/123-planta-geral-jpg"
  );
  assert.equal(
    terrainDevelopmentPlanStoragePath("dev-1", {
      name: "Planta.pdf",
      type: "application/pdf",
      size: 1024
    }, "pdf", 456),
    "gestao-terrenos/loteamentos/dev-1/pdf/456-planta-pdf"
  );
});

test("limita o zoom da planta entre 100% e 400%", () => {
  assert.equal(clampTerrainPlanZoom(0.5), 1);
  assert.equal(clampTerrainPlanZoom(2.25), 2.25);
  assert.equal(clampTerrainPlanZoom(6), 4);
});
