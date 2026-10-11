import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("painel oferece gerador de encartes aos administradores autorizados", () => {
  assert.match(panelHtml, /data-view="encartes"/);
  assert.match(panelHtml, /id="encartesView"/);
  assert.match(panelHtml, /id="flyerMount"/);
  assert.match(panelJs, /encartes: \$\("encartesView"\)/);
  assert.match(panelJs, /viewName === "artesPostagem" \|\| viewName === "encartes"/);
  assert.match(panelJs, /hasPermission\("gerar_imagens_promocoes"\)/);
  assert.match(panelJs, /if \(target === "encartes"\) renderFlyerView\(\)/);
});

test("encarte usa produtos e promoções cadastrados com limite de dez itens", () => {
  assert.match(panelJs, /const FLYER_MAX_ITEMS = 10/);
  assert.match(panelJs, /type === "promocao" \? normalizePromocoes\(client\?\.promocoes\) : normalizeProdutos\(client\?\.produtos\)/);
  assert.match(panelJs, /state\.flyerSelectedIds\.size >= FLYER_MAX_ITEMS/);
  assert.match(panelJs, /Selecione no máximo 10/);
  assert.match(panelJs, /flyerItemDescription\(item/);
  assert.match(panelJs, /postArtMoney\(item\.preco\)/);
  assert.match(panelJs, /id="flyerShowPrices"/);
});

test("encarte oferece seis layouts, identidade do comércio e exportação PNG", () => {
  const layouts = panelJs.match(/key: "(catalogo|oferta|premium|natural|oceano|mosaico)"/g) || [];
  assert.equal(layouts.length, 6);
  assert.match(panelJs, /logoClienteImovelAdmin\(client\)/);
  assert.match(panelJs, /carregarImagemCanvas\(flyerItemImage\(item\)\)/);
  assert.match(panelJs, /canvasParaBlob\(canvas\)/);
  assert.match(panelJs, /baixarBlobCanvas\(blob, "encarte-"/);
  assert.match(panelHtml, /painel\.css\?v=573/);
  assert.match(panelHtml, /painel\.js\?v=875/);
});

test("seis modelos reproduzem composições profissionais usando os dados reais do cliente", () => {
  [
    "Qualidade todo dia",
    "Tecnologia premium",
    "Ofertas relâmpago",
    "Tudo em um só lugar",
    "Mais estilo",
    "Festival de promoções"
  ].forEach((name) => assert.ok(panelJs.includes(name)));
  assert.match(panelJs, /function flyerDrawBrand\(/);
  assert.match(panelJs, /function flyerDrawTrustStrip\(/);
  assert.match(panelJs, /function flyerDrawHeroImage\(/);
  assert.match(panelJs, /function flyerCardRects\(/);
  assert.match(panelJs, /function flyerDiscountPercent\(/);
  assert.match(panelJs, /item\.precoAntigo/);
  assert.match(panelJs, /client\?\.nome \|\| "Nome do seu negócio"/);
  assert.match(panelJs, /telefoneArteAdmin\(client\?\.whatsapp/);
  assert.match(panelJs, /items\.slice\(0, Math\.min\(10, FLYER_MAX_ITEMS\)\)/);
});
test("imagens são tratadas localmente com remoção segura de fundo e fallback", () => {
  assert.match(panelJs, /const flyerPreparedImageCache = new WeakMap\(\)/);
  assert.match(panelJs, /function flyerBorderBackground\(/);
  assert.match(panelJs, /function flyerBorderMatchRatio\(/);
  assert.match(panelJs, /function flyerRemoveConnectedBackground\(/);
  assert.match(panelJs, /const queue = new Int32Array\(totalPixels\)/);
  assert.match(panelJs, /removedRatio < \.06 \|\| removedRatio > \.96/);
  assert.match(panelJs, /shadowColor = "rgba\(8,20,35,\.24\)"/);
  assert.match(panelJs, /function flyerPrepareProductImage\(/);
  assert.match(panelJs, /usando o arquivo original/);
  assert.match(panelJs, /assets\.slice\(1\)\.map\(\(image\) => flyerPrepareProductImage\(image\)\)/);
  assert.match(panelJs, /fundos uniformes são removidos, o produto é recortado e centralizado/);
  assert.match(panelCss, /\.flyer-treatment-note\{/);
});
test("gerador de encartes tem composição responsiva e prévia em formato 4 por 5", () => {
  assert.match(panelCss, /\.flyer-workspace/);
  assert.match(panelCss, /\.flyer-items-grid/);
  assert.match(panelCss, /\.flyer-layout-grid/);
  assert.match(panelCss, /aspect-ratio:4\/5/);
  assert.match(panelCss, /@media\(max-width:700px\)/);
});
