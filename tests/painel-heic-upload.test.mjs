import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");

test("painel reconhece HEIC e HEIF pelo MIME ou extensao", () => {
  assert.match(panelJs, /function isHeicImageFile\(file\)/);
  assert.ok(panelJs.includes('type === "image/heic"'));
  assert.ok(panelJs.includes('type === "image/heif"'));
  assert.ok(panelJs.includes('/\\.(heic|heif)$/i'));
});

test("fotos HEIC sao convertidas para JPEG antes do upload de clientes", () => {
  assert.match(panelJs, /async function prepareClientImageFile\(file\)/);
  assert.ok(panelJs.includes('toType: "image/jpeg", quality: 0.88'));
  assert.ok(panelJs.includes('new File([blob], `${baseName}.jpg`'));
  assert.ok(panelJs.includes("await prepareClientImageFile(originalFile)"));
  assert.ok(panelJs.includes("await prepareClientImageFile(file)"));
});

test("falha na conversao nao envia o HEIC original", () => {
  assert.ok(panelJs.includes("Nao foi possivel converter ${originalName}"));
  assert.ok(panelJs.includes('showToast(error?.message || "Nao foi possivel enviar as imagens.")'));
});

test("seletores de cliente permitem HEIC explicitamente", () => {
  assert.match(panelHtml, /id="clientImagesUpload"[^>]+accept="image\/\*,\.heic,\.heif"/);
  assert.match(panelHtml, /id="clientProfileUpload"[^>]+\.heic,\.heif/);
  assert.match(panelHtml, /id="clientServiceImageUpload"[^>]+image\/heic,image\/heif,\.heic,\.heif/);
  assert.match(panelJs, /id="coImagesUpload"[^>]+accept="image\/\*,\.heic,\.heif"/);
});

test("painel carrega a versao com conversao HEIC", () => {
  assert.ok(panelHtml.includes("painel.js?v=871"));
  assert.ok(panelJs.includes('label: "v871"'));
});
