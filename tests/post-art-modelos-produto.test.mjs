import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import path from "node:path";

const source = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}
const helperNames = [
  "numberFromMoney", "canvasRoundRect", "preencherRoundRect", "desenharImagemCover",
  "desenharImagemContain", "linhasCanvas", "desenharTextoInteiroCanvas", "desenharBordaRoundRect",
  "postArtMoney", "postArtDrawText", "postArtDrawPhoto", "postArtDrawBrand", "desenharIconeWhatsappCanvas",
  "postArtProductHighlights", "postArtDrawFittedText", "postArtBannerRect", "postArtProductPhotoRect", "postArtImageGeometry", "desenharPostArtProdutoReferencia", "postArtItemImage"
];
const sandbox = {
  state: { postArtCustomImage: "" },
  normalizarImagemArteAdmin: (value) => value,
  telefoneArteAdmin: (value) => value,
  formatDateBR: (value) => value.split("-").reverse().join("/"),
  $: () => { throw new Error("Não deve acessar campo de URL"); }
};
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf("const POST_ART_LAYOUTS ="), source.indexOf("const POST_ART_FORMATS ="))
  + "\n" + helperNames.map(functionSource).join("\n")
  + "\nglobalThis.layouts = POST_ART_LAYOUTS.produto; globalThis.promoLayouts = POST_ART_LAYOUTS.promocao;", sandbox);

const client = { nome: "Loja Exemplo", categoria: "Comércio", cidade: "Carlópolis", endereco: "Rua Exemplo, 123", whatsapp: "(43) 99999-1234", instagram: "@lojaexemplo" };
const data = { type: "produto", title: "Produto especial para o seu dia a dia", description: "Conheça as características deste produto e consulte detalhes e disponibilidade com a empresa.", price: "129,90", callout: "NOVIDADE", imageFit: "contain", showSiteLogo: true, phoneFontSize: 24, addressFontSize: 24 };
function mockContext(height) {
  const texts = [];
  const ctx = new Proxy({ canvas: { width: 1080, height }, texts }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createLinearGradient") return () => ({ addColorStop() {} });
      if (key === "measureText") return (value) => ({ width: String(value).length * Number(String(target.font || "20px").match(/(\d+)px/)?.[1] || 20) * .55 });
      if (key === "fillText") return (value, x, y) => texts.push({ value, x, y, font: target.font });
      return () => {};
    }
  });
  return ctx;
}

test("foto pode ser reenquadrada sem sair da moldura nos dois formatos", () => {
  for (const format of ["feed", "reels"]) for (const fit of ["cover", "contain"]) {
    const rect = sandbox.postArtProductPhotoRect(format);
    const img = { width: 1400, height: 700 };
    const frames = [0, .5, 1].map((position) => sandbox.postArtImageGeometry(img, rect, fit, { x: position, y: position }));
    assert.ok(frames[0].x !== frames[2].x || frames[0].y !== frames[2].y);
    for (const frame of frames) {
      assert.equal(frame.w / frame.h, 2);
      if (fit === "cover") {
        assert.ok(frame.x <= rect.x + .01 && frame.x + frame.w >= rect.x + rect.w - .01);
        assert.ok(frame.y <= rect.y + .01 && frame.y + frame.h >= rect.y + rect.h - .01);
      } else {
        assert.ok(frame.x >= rect.x - .01 && frame.x + frame.w <= rect.x + rect.w + .01);
        assert.ok(frame.y >= rect.y - .01 && frame.y + frame.h <= rect.y + rect.h + .01);
      }
    }
    const ctx = mockContext(format === "feed" ? 1080 : 1920);
    const calls = [];
    ctx.drawImage = (...args) => calls.push(args);
    ctx.clip = () => calls.push("clip");
    sandbox.postArtDrawPhoto(ctx, img, rect, fit, 16, "#fff", { x: 1, y: 0 });
    assert.equal(calls[0], "clip");
    assert.equal(calls[1][0], img);
  }
  assert.match(source, /id="postArtResetImagePosition"/);
  assert.match(source, /let imageDrag = null/);
  assert.match(source, /imagePosition: state\.postArtImagePosition/);
});

test("produtos oferecem os oito modelos de referencia sem alterar promocao e servico", () => {
  assert.equal(sandbox.layouts.length, 8);
  assert.equal(new Set(sandbox.layouts.map((layout) => layout.key)).size, 8);
  assert.ok(sandbox.layouts.every((layout) => layout.reference));
  assert.ok(sandbox.layouts.every((layout) => layout.shape === "fashion"));
  assert.equal(new Set(sandbox.layouts.map((layout) => layout.primary)).size, 8);
  assert.equal(sandbox.layouts.map((layout) => layout.nome).join("|"), [
    "01 · Azul Marinho", "02 · Nude Marrom", "03 · Preto Dourado", "04 · Verde Esmeralda",
    "05 · Vinho", "06 · Terracota", "07 · Rosé", "08 · Lavanda"
  ].join("|"));
  assert.match(source, /\["produto", "promocao"\]\.includes\(data\.type\) && layout\.reference/);
  assert.match(source, /\$\{layouts\.length\} estilos adaptados/);
});

test("promocoes oferecem oito cores e os mesmos ajustes em feed e reels", () => {
  assert.equal(sandbox.promoLayouts.length, 8);
  assert.equal(new Set(sandbox.promoLayouts.map((layout) => layout.key)).size, 8);
  assert.equal(new Set(sandbox.promoLayouts.map((layout) => layout.primary)).size, 8);
  for (const layout of sandbox.promoLayouts) for (const format of ["feed", "reels"]) {
    const promo = { ...data, type: "promocao", format, oldPrice: "199,90", validity: "2026-09-30", showHighlightBanner: true, callout: "20% OFF", showHighlightCard: true, highlights: ["Serviço completo", "Atendimento agendado", "Oferta limitada"], descriptionFontSize: 44, titleFontSize: 74, clientLogoSize: 150, clientNameFont: "Impact", imagePosition: { x: 1, y: 0 } };
    const ctx = mockContext(format === "feed" ? 1080 : 1920);
    sandbox.desenharPostArtProdutoReferencia(ctx, promo, client, null, null, null, layout);
    for (const expected of ["EM PROMOÇÃO", "20% OFF", "DESTAQUES DA OFERTA", "DE R$ 199,90", "VÁLIDA ATÉ 30/09/2026"]) assert.ok(ctx.texts.some((entry) => entry.value === expected), expected);
    assert.ok(ctx.texts.every((entry) => entry.y >= 0 && entry.y < ctx.canvas.height));
    const banner = sandbox.postArtBannerRect(promo, 1080, ctx.canvas.height);
    assert.ok(banner.h >= 120);
    const blank = mockContext(ctx.canvas.height);
    sandbox.desenharPostArtProdutoReferencia(blank, { ...promo, price: "", showHighlightBanner: false }, client, null, null, null, layout);
    assert.ok(!blank.texts.some((entry) => /CONSULTE|POR APENAS|DE R\$|EM PROMOÇÃO/.test(entry.value)));
  }
});

test("campo Imagem usada e URL foram removidos mas foto cadastrada e upload permanecem", () => {
  assert.doesNotMatch(source, /Imagem usada|id="postArtImage"|"\bpostArtImage\b"/);
  assert.equal(sandbox.postArtItemImage({ imagem: "foto-cadastrada.jpg" }), "foto-cadastrada.jpg");
  sandbox.state.postArtCustomImage = "data:image/png;base64,teste";
  assert.equal(sandbox.postArtItemImage({ imagem: "foto-cadastrada.jpg" }), "data:image/png;base64,teste");
  sandbox.state.postArtCustomImage = "";
  assert.match(source, /postArtImageUpload/);
});

test("todos os oito modelos desenham Feed e Reels com dados e textos dentro do canvas", () => {
  for (const layout of sandbox.layouts) {
    for (const format of ["feed", "reels"]) {
      const ctx = mockContext(format === "feed" ? 1080 : 1920);
      sandbox.desenharPostArtProdutoReferencia(ctx, { ...data, format }, client, null, null, null, layout);
      assert.ok(ctx.texts.some((entry) => entry.value.includes("129,90")), layout.key);
      assert.ok(ctx.texts.some((entry) => entry.value.includes("Loja")), layout.key);
      assert.ok(ctx.texts.some((entry) => entry.value.includes("Exemplo")), layout.key);
      assert.ok(ctx.texts.some((entry) => entry.value.includes("99999-1234")), layout.key);
      assert.ok(ctx.texts.some((entry) => entry.value.includes("Rua Exemplo")), layout.key);
      assert.ok(!ctx.texts.some((entry) => /WHATSAPP|DETALHES|ATENDIMENTO|PEDIDOS|COMÉRCIO/.test(entry.value)), layout.key);
      assert.ok(ctx.texts.every((entry) => entry.y >= 0 && entry.y < ctx.canvas.height), layout.key);
    }
  }
});

test("titulos e descricoes longos cabem e ausencia de preco nao gera texto", () => {
  for (const format of ["feed", "reels"]) {
    const ctx = mockContext(format === "feed" ? 1080 : 1920);
    sandbox.desenharPostArtProdutoReferencia(ctx, { ...data, format, title: "TITULO produto com nome completo e apresentação especial para todos os clientes da cidade", description: "DESCRICAO completa do produto com as informações cadastradas pela empresa. Consulte os detalhes, opções e disponibilidade pelo contato informado. O texto pode ser alterado antes de baixar a postagem em imagem.", price: "" }, client, null, null, null, sandbox.layouts[0]);
    assert.ok(!ctx.texts.some((entry) => /CONSULTE|POR APENAS/.test(entry.value)));
    assert.ok(!ctx.texts.some((entry) => entry.value.includes("POR APENAS")));
    const titleTop = ctx.texts.find((entry) => entry.value.includes("TITULO"))?.y;
    const descriptionTop = ctx.texts.find((entry) => entry.value.includes("DESCRICAO"))?.y;
    assert.ok(Number.isFinite(titleTop) && Number.isFinite(descriptionTop) && descriptionTop > titleTop + 40, `${format}: descrição não pode cobrir o título`);
    assert.ok(ctx.texts.every((entry) => entry.y < ctx.canvas.height));
  }
});

test("formulario oferece fontes e controles opcionais da logo tarja e card", () => {
  assert.match(source, /id="postArtPhoneFontSize" type="range"/);
  assert.match(source, /id="postArtAddressFontSize" type="range"/);
  assert.match(source, /id="postArtShowSiteLogo" type="checkbox"/);
  assert.match(source, /id="postArtShowHighlightBanner" type="checkbox"/);
  assert.match(source, /id="postArtHighlightBannerColor" type="color"/);
  assert.match(source, /id="postArtShowHighlightCard" type="checkbox"/);
  assert.match(source, /id="postArtDescriptionFontSize" type="range"/);
  assert.match(source, /id="postArtHighlightFontSize" type="range"/);
  assert.match(source, /id="postArtClientLogoSize" type="range"/);
  assert.match(source, /id="postArtTitleFontSize" type="range"/);
  assert.match(source, /id="postArtClientNameFont"/);
  const clientFontOptions = source.match(/<select id="postArtClientNameFont">([\s\S]*?)<\/select>/)?.[1] || "";
  assert.equal((clientFontOptions.match(/<option /g) || []).length, 10);
  assert.match(source, /editorial: true/);
});

test("titulo ajustavel respeita a logo e no reels a marca fica acima da foto", () => {
  const originalContain = sandbox.desenharImagemContain;
  try {
    for (const format of ["feed", "reels"]) {
      const logoCalls = [];
      sandbox.desenharImagemContain = (_ctx, _image, x, y, width, height) => logoCalls.push({ x, y, width, height });
      const ctx = mockContext(format === "feed" ? 1080 : 1920);
      sandbox.desenharPostArtProdutoReferencia(ctx, {
        ...data,
        format,
        clientLogoSize: format === "feed" ? 150 : 180,
        clientNameFont: "Impact",
        titleFontSize: format === "feed" ? 74 : 92
      }, client, null, {}, null, sandbox.layouts[0]);
      const clientLogo = logoCalls[0];
      const productTitle = ctx.texts.find((entry) => entry.value.includes("Produto"));
      assert.ok(clientLogo && productTitle);
      assert.ok(productTitle.y > clientLogo.y + clientLogo.height, `${format}: título não pode encostar na logo`);
      if (format === "reels") assert.ok(clientLogo.y + clientLogo.height <= 190, "reels: logo deve permanecer acima da imagem do produto");
      assert.match(ctx.texts.find((entry) => entry.value.includes("Loja"))?.font || "", /Impact/);
    }
  } finally {
    sandbox.desenharImagemContain = originalContain;
  }
});

test("card opcional usa detalhes reais e limita os destaques a tres nos oito modelos", () => {
  assert.equal(sandbox.postArtProductHighlights({ marca: "Exemplo", cores: "Preto" }).join("|"), "Marca: Exemplo|Cores: Preto");
  for (const layout of sandbox.layouts) {
    for (const format of ["feed", "reels"]) {
      const ctx = mockContext(format === "feed" ? 1080 : 1920);
      sandbox.desenharPostArtProdutoReferencia(ctx, { ...data, format, showHighlightBanner: true, highlightBannerColor: "#ffcc00", showHighlightCard: true, highlights: ["Marca: Exemplo", "Cor: Preto", "Tamanho: M", "QUARTO OMITIDO"], descriptionFontSize: 44, highlightFontSize: 36 }, client, null, null, null, layout);
      assert.ok(ctx.texts.some((entry) => entry.value === "PRODUTO EM DESTAQUE"));
      assert.ok(ctx.texts.some((entry) => entry.value === "DESTAQUE DO PRODUTO"));
      assert.ok(!ctx.texts.some((entry) => entry.value.includes("QUARTO")));
      assert.ok(ctx.texts.every((entry) => entry.y >= 0 && entry.y < ctx.canvas.height));
    }
  }
});

test("fonte solicitada diminui para manter a descricao dentro da altura disponivel", () => {
  const ctx = mockContext(1080);
  const height = sandbox.postArtDrawFittedText(ctx, "Descrição longa do produto com todas as informações. ".repeat(5), 0, 100, 445, 120, 44, "#000000");
  assert.ok(height <= 120);
  assert.ok(ctx.texts.every((entry) => entry.y >= 100 && entry.y <= 220));
});

// Optional local visual QA: uses the same production helpers with a real Canvas.
test("tarja pode ocupar qualquer posicao dentro do canvas e oferece arraste", () => {
  for (const format of ["feed", "reels"]) {
    const height = format === "feed" ? 1080 : 1920;
    for (const bannerX of [0, 50, 100]) for (const bannerY of [0, 50, 100]) {
      const rect = sandbox.postArtBannerRect({ format, bannerX, bannerY }, 1080, height);
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= 1080 && rect.y + rect.h <= height);
    }
  }
  assert.match(source, /setPointerCapture/);
  assert.match(source, /id="postArtBannerX"/);
  assert.match(source, /id="postArtBannerY"/);
});

test("nome fica maior e centralizado quando a logo do portal e removida", () => {
  const sizes = [true, false].map((showSiteLogo) => {
    const ctx = mockContext(1080);
    sandbox.postArtDrawBrand(ctx, { nome: "Cliente" }, null, null, sandbox.layouts[0], { editorial: true, showSiteLogo, width: 445, logoSize: 92 });
    assert.equal(ctx.textAlign, "center");
    return Number(ctx.texts[0].font.match(/(\d+)px/)[1]);
  });
  assert.ok(sizes[1] > sizes[0]);
  const ctx = mockContext(1080);
  sandbox.postArtDrawBrand(ctx, { nome: "Cliente" }, null, null, sandbox.layouts[0], { editorial: true, showSiteLogo: false, width: 445, logoSize: 120, nameColor: "#123456" });
  assert.match(ctx.texts[0].font, /italic 900 .*Georgia/);
});

test("sem preco a descricao e o card aproveitam o espaco liberado", () => {
  for (const format of ["feed", "reels"]) {
    const results = ["129,90", ""].map((price) => {
      const ctx = mockContext(format === "feed" ? 1080 : 1920);
      sandbox.desenharPostArtProdutoReferencia(ctx, { ...data, format, price, showHighlightCard: true, highlights: ["Cor: Preto", "Tamanho: M"], descriptionFontSize: 44 }, client, null, null, null, sandbox.layouts[0]);
      return ctx.texts.find((entry) => entry.value === "DESTAQUE DO PRODUTO").y;
    });
    assert.ok(results[1] > results[0]);
  }
});

if (process.env.CODEX_ART_QA_DIR && process.env.CODEX_CANVAS_MODULE) {
  const require = createRequire(import.meta.url);
  const { createCanvas, loadImage } = require(process.env.CODEX_CANVAS_MODULE);
  const output = process.env.CODEX_ART_QA_DIR;
  const qaPromotion = process.env.CODEX_ART_QA_TYPE === "promocao";
  const qaLayouts = qaPromotion ? sandbox.promoLayouts : sandbox.layouts;
  const qaData = qaPromotion ? { type: "promocao", callout: "20% OFF", oldPrice: "199,90", validity: "2026-09-30" } : {};
  mkdirSync(output, { recursive: true });
  const product = createCanvas(500, 650);
  const pc = product.getContext("2d");
  pc.fillStyle = "#f6f2ea"; pc.fillRect(0, 0, 500, 650);
  pc.fillStyle = "#227460"; pc.fillRect(125, 100, 250, 430);
  pc.fillStyle = "#e4c692"; pc.fillRect(140, 130, 220, 125);
  pc.fillStyle = "#ffffff"; pc.font = "bold 30px Arial"; pc.textAlign = "center"; pc.fillText("PRODUTO", 250, 350);
  pc.font = "22px Arial"; pc.fillText("EXEMPLO", 250, 390);
  const commerceLogo = createCanvas(120, 120);
  const lc = commerceLogo.getContext("2d");
  lc.fillStyle = "#227460"; lc.fillRect(0, 0, 120, 120);
  lc.fillStyle = "#ffffff"; lc.font = "bold 25px Arial"; lc.fillText("LOJA", 24, 68);
  const portalLogo = await loadImage(path.resolve("images/img_padrao_site/logo_1.png"));
  for (const format of ["feed", "reels"]) {
    const height = format === "feed" ? 1080 : 1920;
    const sheet = createCanvas(1440, format === "feed" ? 720 : 1280);
    const sc = sheet.getContext("2d");
    qaLayouts.forEach((layout, index) => {
      const canvas = createCanvas(1080, height);
      sandbox.desenharPostArtProdutoReferencia(canvas.getContext("2d"), { ...data, ...qaData, format, showSiteLogo: index % 2 === 0, clientLogoSize: index % 2 ? (format === "feed" ? 150 : 180) : (format === "feed" ? 92 : 110), clientNameFont: ["Georgia", "Arial", "Trebuchet MS", "Verdana", "Times New Roman", "Courier New", "Impact", "Garamond"][index], titleFontSize: index % 2 ? (format === "feed" ? 68 : 86) : (format === "feed" ? 48 : 64), price: index % 2 ? "" : data.price, showHighlightBanner: true, highlightBannerColor: "#ffcc00", showHighlightCard: true, highlights: ["Marca: Exemplo", "Cor: Preto", "Tamanho: M"], descriptionFontSize: 36, highlightFontSize: 28 }, client, product, commerceLogo, portalLogo, layout);
      writeFileSync(path.join(output, layout.key + "-" + format + ".png"), canvas.toBuffer("image/png"));
      sc.drawImage(canvas, index % 4 * 360, Math.floor(index / 4) * height / 3, 360, height / 3);
    });
    writeFileSync(path.join(output, "contato-" + format + ".png"), sheet.toBuffer("image/png"));
  }
}
