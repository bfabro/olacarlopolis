import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";

const source = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = /\n(?:async )?function /.exec(source.slice(start + 1));
  return source.slice(start, next ? start + 1 + next.index : undefined);
}
const fields = { storyMessage: { value: "", dataset: {} }, storyHeadline: { value: "" }, storyCta: { value: "" }, storyPhrasePreset: { value: "" } };
const sandbox = {
  state: { selectedStoryTemplate: "vitrine", selectedStoryComposition: "spotlight", storyImageTransforms: [], selectedStoryImageSlot: 0, storyCanvasSlots: [] },
  telefoneArteAdmin: value => value,
  $: id => fields[id],
  storyCurrentClient: () => null
};
vm.createContext(sandbox);
const palettes = source.slice(source.indexOf("const STORY_TEMPLATE_PALETTES ="), source.indexOf("const STORY_PHRASE_PRESETS ="));
const names = source.slice(source.indexOf("const STORY_TEMPLATE_NAMES ="), source.indexOf("let storyPreviewRequest ="));
const helpers = ["canvasRoundRect", "preencherRoundRect", "desenharBordaRoundRect", "desenharImagemContain", "linhasCanvas", "postArtDrawFittedText", "clampNumero", "storySlotCount", "fillStoryInstitutionalCopy", "storyDrawLogo", "storyContactLine", "storyDrawPositionedImage", "storyInstitutionalLayout", "storyDrawCommercialArt"];
vm.runInContext(palettes + names + helpers.map(functionSource).join("\n") + "\nglobalThis.templates = Object.keys(STORY_TEMPLATE_NAMES);", sandbox);
function context(height) {
  const target = { canvas: { width: 1080, height }, texts: [] };
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return t[key];
      if (key === "measureText") return value => ({ width: String(value).length * Number(String(t.font || "20px").match(/(\d+)px/)?.[1] || 20) * .52 });
      if (key === "fillText") return (value, x, y) => t.texts.push({ value, x, y, font: t.font });
      return () => {};
    }
  });
}
const client = { id: "loja", nome: "Comércio Exemplo", descricaoCurta: "Atendimento próximo, produtos selecionados e soluções para o seu dia a dia.", whatsapp: "(43) 99999-1234", instagram: "@comercio" };
const data = { client, logo: null, siteLogo: null, photos: [null, null, null, null], headline: "Conheça quem faz parte da nossa cidade.", message: client.descricaoCurta, cta: "Conheça no Olá Carlópolis", accent: "#f4b942", showContact: true, showProspect: true };

test("editor oferece oito modelos e uma duas ou quatro fotos", () => {
  assert.equal(sandbox.templates.length, 8);
  assert.equal((html.match(/data-story-template="/g) || []).length, 8);
  assert.match(html, /data-story-composition="duo"/);
  assert.match(html, /id="storyMessage"[^>]*maxlength="400"/);
  for (const [composition, count] of [["spotlight", 1], ["duo", 2], ["mosaic", 4]]) {
    sandbox.state.selectedStoryComposition = composition;
    assert.equal(sandbox.storySlotCount(), count);
  }
  assert.match(source, /if \(!isMaster\(\) \|\| !\$\("storyClient"\)\) return/);
});

test("descricao curta acompanha o cliente sem apagar edicao manual na mesma empresa", () => {
  sandbox.fillStoryInstitutionalCopy(client, true);
  assert.equal(fields.storyMessage.value, client.descricaoCurta);
  fields.storyMessage.value = "Minha edição";
  sandbox.fillStoryInstitutionalCopy(client);
  assert.equal(fields.storyMessage.value, "Minha edição");
  sandbox.fillStoryInstitutionalCopy({ id: "outra", shortDescription: "Outro comércio" });
  assert.equal(fields.storyMessage.value, "Outro comércio");
  sandbox.fillStoryInstitutionalCopy({ id: "vazio" });
  assert.equal(fields.storyMessage.value, "");
});

test("oito composicoes distintas mantem fotos textos e assinatura separados nos dois formatos", () => {
  const overlaps = (a, b) => a.x < b.x + b.w - .01 && a.x + a.w > b.x + .01 && a.y < b.y + b.h - .01 && a.y + a.h > b.y + .01;
  for (const height of [1350, 1920]) for (const composition of ["spotlight", "duo", "mosaic"]) {
    const signatures = new Set();
    for (const template of sandbox.templates) {
      const layout = sandbox.storyInstitutionalLayout(template, composition, 1080, height);
      signatures.add(JSON.stringify(layout));
      assert.equal(layout.photos.length, composition === "spotlight" ? 1 : composition === "duo" ? 2 : 4);
      for (const rect of [...layout.photos, layout.panel]) {
        assert.ok(rect.x >= 0 && rect.y >= 170 && rect.x + rect.w <= 1080 && rect.y + rect.h < height - 154);
        assert.ok(rect.w > 0 && rect.h > 0);
      }
      for (let i = 0; i < layout.photos.length; i++) {
        assert.ok(!overlaps(layout.photos[i], layout.panel), template);
        for (let j = i + 1; j < layout.photos.length; j++) assert.ok(!overlaps(layout.photos[i], layout.photos[j]), template);
      }
      sandbox.state.selectedStoryTemplate = template;
      sandbox.state.selectedStoryComposition = composition;
      const ctx = context(height);
      const description = ("Descrição institucional completa com informações reais do cliente. ".repeat(6)).slice(0, 380) + " FIMDESCRICAO";
      sandbox.storyDrawCommercialArt(ctx, { ...data, message: description }, false);
      assert.equal(sandbox.state.storyCanvasSlots.length, layout.photos.length);
      assert.ok(ctx.texts.some(item => item.value.includes("FIMDESCRICAO")), template);
      assert.ok(ctx.texts.some(item => item.value === "ESTÁ NO OLÁ CARLÓPOLIS"));
      assert.ok(ctx.texts.some(item => item.value === "olacarlopolis.com"));
      assert.ok(ctx.texts.every(item => item.y >= 0 && item.y < height));
      assert.ok(!ctx.texts.some(item => /^[1-4]$/.test(item.value)), "PNG não deve mostrar marcadores de edição");
    }
    assert.equal(signatures.size, 8);
  }
});

if (process.env.CODEX_STORY_QA_DIR && process.env.CODEX_CANVAS_MODULE) {
  const require = createRequire(import.meta.url);
  const { createCanvas, loadImage } = require(process.env.CODEX_CANVAS_MODULE);
  const output = process.env.CODEX_STORY_QA_DIR;
  mkdirSync(output, { recursive: true });
  const photos = ["#537c61", "#bd9872", "#678aab", "#ad7792"].map((color, index) => {
    const image = createCanvas(800, 800);
    const ctx = image.getContext("2d");
    ctx.fillStyle = color; ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(120, 200, 560, 390);
    ctx.fillStyle = color; ctx.font = "bold 54px Arial"; ctx.textAlign = "center";
    ctx.fillText("FOTO DO COMÉRCIO", 400, 360); ctx.fillText(String(index + 1), 400, 440);
    return image;
  });
  const siteLogo = await loadImage(path.resolve("images/img_padrao_site/logo_1.png"));
  for (const height of [1350, 1920]) for (const composition of ["spotlight", "duo", "mosaic"]) {
    const sheet = createCanvas(1440, height * 2 / 3);
    const ctx = sheet.getContext("2d");
    sandbox.templates.forEach((template, index) => {
      sandbox.state.selectedStoryTemplate = template;
      sandbox.state.selectedStoryComposition = composition;
      const canvas = createCanvas(1080, height);
      sandbox.storyDrawCommercialArt(canvas.getContext("2d"), { ...data, photos, logo: photos[0], siteLogo }, false);
      writeFileSync(path.join(output, `${template}-${composition}-${height}.png`), canvas.toBuffer("image/png"));
      ctx.drawImage(canvas, index % 4 * 360, Math.floor(index / 4) * height / 3, 360, height / 3);
    });
    writeFileSync(path.join(output, `contato-${composition}-${height}.png`), sheet.toBuffer("image/png"));
  }
}

