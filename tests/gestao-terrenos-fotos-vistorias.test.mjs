import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainInspectionRecord,
  buildTerrainPhotoRecord,
  terrainGeneralPhotoStoragePath,
  terrainInspectionPhotoStoragePath,
  terrainInspectionRecords,
  terrainPhotoCategoryLabel,
  terrainPhotoRecords,
  terrainStatusAfterInspection,
  validateTerrainImageFile
} from "../admin/gestao-terrenos-schema.js";

const image = { name: "Frente do Terreno.JPG", type: "image/jpeg", size: 2048 };

test("valida imagem e organiza fotos gerais no Storage", () => {
  assert.equal(validateTerrainImageFile(image), true);
  assert.equal(
    terrainGeneralPhotoStoragePath("terrain-1", image, 123, 2),
    "gestao-terrenos/terrenos/terrain-1/fotos-gerais/123-2-frente-do-terreno-jpg"
  );
  assert.throws(
    () => validateTerrainImageFile({ name: "arquivo.pdf", type: "application/pdf", size: 100 }),
    /somente arquivos de imagem/
  );
  assert.throws(
    () => validateTerrainImageFile({ name: "grande.jpg", type: "image/jpeg", size: 9 * 1024 * 1024 }),
    /8 MB/
  );
});

test("cria e lista fotos gerais por terreno e categoria", () => {
  const records = {
    a: buildTerrainPhotoRecord({
      terrain_id: "terrain-1",
      categoria: "frente",
      url: "https://example.com/a.jpg",
      path: "a.jpg",
      created_by_uid: "user-1",
      created_by_name: "Admin"
    }, { id: "a", timestamp: 100 }),
    b: buildTerrainPhotoRecord({
      terrain_id: "terrain-2",
      categoria: "outra",
      url: "https://example.com/b.jpg",
      path: "b.jpg",
      created_by_uid: "user-1",
      created_by_name: "Admin"
    }, { id: "b", timestamp: 200 })
  };
  assert.deepEqual(terrainPhotoRecords(records, "terrain-1").map((photo) => photo.id), ["a"]);
  assert.equal(terrainPhotoCategoryLabel(records.a.categoria), "Frente");
});

test("organiza fotos de vistoria por terreno e vistoria", () => {
  assert.equal(
    terrainInspectionPhotoStoragePath("terrain-1", "inspection-1", image, 456, 0),
    "gestao-terrenos/terrenos/terrain-1/vistorias/inspection-1/456-0-frente-do-terreno-jpg"
  );
});

test("cria vistoria completa com fotos e responsável", () => {
  const inspection = buildTerrainInspectionRecord({
    terrain_id: "terrain-1",
    data: "2026-08-31",
    hora: "14:30",
    responsavel_uid: "user-1",
    responsavel_nome: "Bruno",
    responsavel_email: "BRUNO@EXAMPLE.COM",
    situacao_atual: "monitorar",
    altura_mato: "de_30_a_60_cm",
    grau_dificuldade: "medio",
    observacoes: "Retornar em quinze dias.",
    precisa_limpeza: false,
    recomendar_contato: true,
    fotos: { photo: { url: "https://example.com/photo.jpg", path: "photo.jpg" } }
  }, { id: "inspection-1", timestamp: 1000 });
  assert.equal(inspection.id, "inspection-1");
  assert.equal(inspection.responsavel_email, "bruno@example.com");
  assert.equal(inspection.recomendar_contato, true);
  assert.equal(inspection.fotos.photo.path, "photo.jpg");
});

test("mantém o histórico de vistorias em ordem decrescente", () => {
  const base = {
    terrain_id: "terrain-1",
    responsavel_uid: "user-1",
    responsavel_nome: "Bruno",
    responsavel_email: "bruno@example.com",
    situacao_atual: "monitorar",
    altura_mato: "ate_30_cm",
    grau_dificuldade: "facil",
    observacoes: "Vistoria concluída.",
    precisa_limpeza: false,
    recomendar_contato: false
  };
  const records = {
    old: buildTerrainInspectionRecord({ ...base, data: "2026-08-20", hora: "09:00" }, { id: "old", timestamp: 1 }),
    recent: buildTerrainInspectionRecord({ ...base, data: "2026-08-31", hora: "08:00" }, { id: "recent", timestamp: 2 }),
    other: buildTerrainInspectionRecord({ ...base, terrain_id: "terrain-2", data: "2026-09-01", hora: "08:00" }, { id: "other", timestamp: 3 })
  };
  assert.deepEqual(terrainInspectionRecords(records, "terrain-1").map((inspection) => inspection.id), ["recent", "old"]);
});

test("atualiza status quando a vistoria indica necessidade de limpeza", () => {
  assert.equal(terrainStatusAfterInspection("monitorar", {
    situacao_atual: "pode_precisar_limpeza",
    precisa_limpeza: true
  }), "precisa_limpeza");
  assert.equal(terrainStatusAfterInspection("limpo", {
    situacao_atual: "monitorar",
    precisa_limpeza: false
  }), "monitorar");
  assert.equal(terrainStatusAfterInspection("inativo", {
    situacao_atual: "precisa_limpeza",
    precisa_limpeza: true
  }), "inativo");
});
