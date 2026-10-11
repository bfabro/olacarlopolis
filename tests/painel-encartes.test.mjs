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
  assert.match(panelHtml, /painel\.css\?v=571/);
  assert.match(panelHtml, /painel\.js\?v=873/);
});

test("gerador de encartes tem composição responsiva e prévia em formato 4 por 5", () => {
  assert.match(panelCss, /\.flyer-workspace/);
  assert.match(panelCss, /\.flyer-items-grid/);
  assert.match(panelCss, /\.flyer-layout-grid/);
  assert.match(panelCss, /aspect-ratio:4\/5/);
  assert.match(panelCss, /@media\(max-width:700px\)/);
});
