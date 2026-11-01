import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WEEKLY_POST_MIN_ITEMS,
  WEEKLY_POST_MAX_ITEMS,
  WEEKLY_POST_DEFAULT_HEADER_TITLE,
  WEEKLY_POST_FONT_SCALE_MAX,
  WEEKLY_POST_FONT_SCALE_MIN,
  weeklyPostCardFields,
  weeklyPostDiverseItems,
  weeklyPostFontScale,
  weeklyPostGridLayout,
  weeklyPostHeaderLines,
  weeklyPostMoveOrder,
  weeklyPostPages,
  weeklyPostRecordReference,
  weeklyPostStatusKind,
  weeklyPostUniqueItems
} from "../admin/weekly-post-layout.js";

const panel = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");

test("central de postagens separa cada ideia em um fluxo próprio", () => {
  assert.match(html, /Central de postagens/);
  assert.match(panel, /postArtCentralMode: "catalogo"/);
  assert.match(panel, /key: "semanal"/);
  assert.match(panel, /key: "comercios"/);
  assert.match(panel, /renderWeeklyPostView/);
  assert.match(panel, /renderCommercePostView/);
});

test("resumo semanal usa novidades reais, deduplicadas e entre quatro e seis itens", () => {
  assert.equal(WEEKLY_POST_MIN_ITEMS, 4);
  assert.equal(WEEKLY_POST_MAX_ITEMS, 6);
  assert.match(panel, /getPanelSnapshot\("novidades"/);
  assert.match(panel, /function weeklyPostItems/);
  assert.match(panel, /weeklyPostUniqueItems/);
  assert.match(panel, /Últimos 7 dias/);
  assert.match(panel, /Últimos 14 dias/);
  assert.match(panel, /Últimos 30 dias/);
  assert.match(panel, /id="weeklyPostMaxItems"/);
  assert.match(panel, /weeklyPostSelectedIds\.size >= itemLimit/);
  const items = [
    { id: "n1", destinoTipo: "imovel", itemId: "casa-1", dataCriacao: 300 },
    { id: "n2", destinoTipo: "imovel", itemId: "casa-1", dataCriacao: 200 },
    { id: "n3", destinoTipo: "promocao", itemId: "promo-1", dataCriacao: 100 }
  ];
  assert.deepEqual(weeklyPostUniqueItems(items).map((item) => item.id), ["n1", "n3"]);
});

test("seleção automática prioriza diversidade e regeneração sem criar dados", () => {
  const items = [
    { id: "1", tipo: "imovel", dataCriacao: 600 },
    { id: "2", tipo: "imovel", dataCriacao: 500 },
    { id: "3", tipo: "promocao", dataCriacao: 400 },
    { id: "4", tipo: "servico", dataCriacao: 300 },
    { id: "5", tipo: "automovel", dataCriacao: 200 },
    { id: "6", tipo: "comercio", dataCriacao: 100 }
  ];
  const first = weeklyPostDiverseItems(items, 4);
  assert.equal(first.length, 4);
  assert.equal(new Set(first.map((item) => item.tipo)).size, 4);
  const regenerated = weeklyPostDiverseItems(items, 4, first.map((item) => item.id));
  assert.equal(regenerated.length, 4);
  assert.match(panel, /id="weeklyPostRegenerate"/);
  assert.match(panel, /regenerateWeeklyPostSelection/);
  assert.match(panel, /Nenhuma novidade publicada neste período\. A arte não cria dados de demonstração/);
});

test("ordem manual e referências preservam ids e links para paginação futura", () => {
  assert.deepEqual(weeklyPostMoveOrder(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(weeklyPostMoveOrder(["a", "b", "c"], "b", 1), ["a", "c", "b"]);
  assert.deepEqual(weeklyPostPages([1, 2, 3, 4, 5, 6, 7], 6), [[1, 2, 3, 4, 5, 6], [7]]);
  assert.deepEqual(weeklyPostRecordReference({ id: "n1", link: "/item", destinoTipo: "imovel", destinoId: "c1", itemId: "i1", dataCriacao: 123 }), {
    id: "n1", recordKey: "imovel:i1", link: "/item", destinationType: "imovel", destinationId: "c1", itemId: "i1", timestamp: 123
  });
  assert.match(panel, /data-weekly-post-order-id/);
  assert.match(panel, /canvas\.dataset\.recordRefs/);
  assert.match(panel, /canvas\.dataset\.pageCount/);
});

test("layouts de story e feed se adaptam a quatro, cinco e seis cards", () => {
  for (const count of [4, 5, 6]) {
    const story = weeklyPostGridLayout({ key: "reels", width: 1080, height: 1920 }, count);
    const feed = weeklyPostGridLayout({ key: "feed", width: 1080, height: 1350 }, count);
    assert.equal(story.columns, 2);
    assert.equal(feed.columns, 2);
    assert.equal(story.rows, Math.ceil(count / 2));
    assert.equal(feed.rows, Math.ceil(count / 2));
    assert.ok(story.cardWidth > 450 && story.cardHeight > 300);
    assert.ok(feed.cardWidth > 450 && feed.cardHeight > 280);
    assert.ok(story.ctaY + story.ctaHeight <= 1920 - 250, "CTA respeita a área segura inferior do Story");
  }
  const sixStory = weeklyPostGridLayout({ key: "reels", width: 1080, height: 1920 }, 6);
  const sixFeed = weeklyPostGridLayout({ key: "feed", width: 1080, height: 1350 }, 6);
  assert.equal(sixStory.dense, true);
  assert.equal(sixFeed.dense, true);
  assert.ok(sixStory.cardHeight >= 390, "seis cards continuam legíveis com mais pôr do sol visível no Story");
  assert.ok(sixFeed.cardHeight >= 315, "seis cards aproveitam a altura disponível no Feed");
  assert.match(panel, /const isLastCentered = count % 2 === 1/);
});

test("campos ausentes e duplicados são omitidos sem inventar informações", () => {
  assert.deepEqual(weeklyPostCardFields({ estabelecimento: "Loja Real", tituloConteudo: "Produto X", acao: "Fotos atualizadas" }), {
    client: "Loja Real", title: "Produto X", change: "Fotos atualizadas", description: ""
  });
  assert.deepEqual(weeklyPostCardFields({ tituloConteudo: "Serviço Y" }), { client: "", title: "Serviço Y", change: "", description: "" });
  assert.deepEqual(weeklyPostCardFields({ estabelecimento: "Casa Azul", tituloConteudo: "Casa Azul", acao: "Casa Azul" }), {
    client: "", title: "Casa Azul", change: "", description: ""
  });
  assert.deepEqual(weeklyPostCardFields({ estabelecimento: "Mercado Real", tituloConteudo: "Lenço umedecido", acao: "Promoção atualizada", descricao: "Promoção atualizada", valor: "R$ 12,90" }), {
    client: "Mercado Real", title: "Lenço umedecido", change: "Promoção atualizada", description: "Valor: R$ 12,90"
  });
  assert.deepEqual(weeklyPostCardFields({ estabelecimento: "Heloisa Escorsin", tituloConteudo: "Grupo de clientes", acao: "Novo grupo de WhatsApp criado", descricao: "Novo grupo de WhatsApp criado", categoria: "Grupos WhatsApp" }), {
    client: "Heloisa Escorsin", title: "Grupo de clientes", change: "Novo grupo de WhatsApp criado", description: "Grupos WhatsApp"
  });
  assert.equal(weeklyPostStatusKind({ acao: "Imóvel inserido" }), "new");
  assert.equal(weeklyPostStatusKind({ acao: "Fotos atualizadas" }), "updated");
  assert.doesNotMatch(panel, /item\.estabelecimento \|\| "Olá Carlópolis"/);
});

test("arte usa a identidade oficial, foto real e tipografia sem contorno pesado", () => {
  assert.match(panel, /carregarImagemCanvas\("\.\.\/images\/img_padrao_site\/logo_1\.png"\)/);
  assert.match(panel, /carregarImagemCanvas\("\.\.\/images\/turismo\/ponte\.jpg"\)/);
  assert.equal(WEEKLY_POST_DEFAULT_HEADER_TITLE, "Novidades no Olá Carlópolis");
  assert.deepEqual(weeklyPostHeaderLines(WEEKLY_POST_DEFAULT_HEADER_TITLE), ["Novidades no", "Olá Carlópolis"]);
  assert.match(panel, /navy: "#092B45"/);
  assert.match(panel, /accent: "#FFBB2D"/);
  assert.match(panel, /white: "#FFFFFF"/);
  assert.doesNotMatch(panel, /strokeText\("NOVIDADES/);
  assert.match(panel, /const logoX = format\.width - logoSize/);
  assert.match(panel, /drawWeeklyLogoTransparent\(ctx, assets\.siteLogo/);
  assert.match(panel, /desenharImagemCover\(ctx, assets\.headerImage/);
});

test("cards usam a ação real na tarja, descrição informativa e enquadramento ajustável", () => {
  assert.match(panel, /status\.label/);
  assert.match(panel, /const imageY = y \+ badgeH/);
  assert.match(panel, /ctx\.imageSmoothingQuality = "high"/);
  assert.match(panel, /function weeklyPostImageTransform/);
  assert.match(panel, /containScale \+ \(coverScale - containScale\)/);
  assert.match(panel, /ctx\.drawImage\(image, x \+ transform\.offsetX/);
  assert.match(panel, /function weeklyPostDrawFittedText/);
  assert.match(panel, /lines = lines\.slice\(0, maxLines\)/);
  assert.match(panel, /fields\.client/);
  assert.match(panel, /fields\.title/);
  assert.match(panel, /fields\.description/);
  assert.match(panel, /weeklyPostImagePositions/);
  assert.match(panel, /id="weeklyPostImageZoom"/);
  assert.match(panel, /0%<\/b> mostra a imagem inteira/);
  assert.match(panel, /function weeklyPostAvailableImages/);
  assert.match(panel, /centralPostAssets\(items, weeklyPostImage\)/);
  assert.match(panel, /data-weekly-post-image-url/);
  assert.match(panel, /Escolha outra foto/);
  assert.match(panel, /bindWeeklyPostCanvasDrag/);
  assert.match(panel, /ajuste o zoom e arraste dentro do card/);
  assert.doesNotMatch(panel, /assets\.logos\?\.\[index\]/);
});

test("ajustes gerais editam o cabeçalho e padronizam as fontes de todos os cards", () => {
  assert.equal(WEEKLY_POST_FONT_SCALE_MIN, 80);
  assert.equal(WEEKLY_POST_FONT_SCALE_MAX, 140);
  assert.equal(weeklyPostFontScale(70), 80);
  assert.equal(weeklyPostFontScale(125), 125);
  assert.equal(weeklyPostFontScale(180), 140);
  assert.match(panel, /weeklyPostHeaderTitle: WEEKLY_POST_DEFAULT_HEADER_TITLE/);
  assert.match(panel, /weeklyPostHeaderStyle: "classic"/);
  assert.match(panel, /key: "classic", label: "Clássico"/);
  assert.match(panel, /key: "banner", label: "Faixa premium"/);
  assert.match(panel, /key: "editorial", label: "Editorial"/);
  assert.match(panel, /data-weekly-header-style/);
  assert.match(panel, /style === "banner"/);
  assert.match(panel, /style === "editorial"/);
  assert.match(panel, /weeklyPostHeaderTitleScale: 100/);
  assert.match(panel, /weeklyPostCardTitleScale: 100/);
  assert.match(panel, /weeklyPostCardDescriptionScale: 100/);
  assert.match(panel, /id="weeklyPostHeaderTitle"/);
  assert.match(panel, /weeklyPostGlobalEditorHtml/);
  assert.doesNotMatch(panel, /data-weekly-post-title-id/);
  assert.match(panel, /centralPostSchedulePreview\("weekly"\)/);
  assert.match(panel, /weight: 950, color: theme\.navy/);
  assert.match(css, /\.weekly-post-global-editor/);
  assert.match(css, /\.weekly-post-header-styles/);
  assert.match(css, /\.weekly-post-header-style-sample\.is-banner/);
  assert.match(css, /\.weekly-post-header-style-sample\.is-editorial/);
  assert.match(css, /\.weekly-post-image-thumbnails/);
});

test("prévia e PNG usam o mesmo canvas nos formatos 1080 por 1920 e 1080 por 1350", () => {
  assert.match(panel, /weeklyPostFormatKey: "reels"/);
  assert.match(panel, /width: 1080, height: 1920/);
  assert.match(panel, /Feed 4:5/);
  assert.match(panel, /width: 1080, height: 1350/);
  assert.match(panel, /weeklyPostCanvas/);
  assert.match(panel, /await atualizarPreviaPostSemanal\(\)/);
  assert.match(panel, /canvasParaBlob\(canvas\)/);
  assert.match(panel, /baixarBlobCanvas/);
  assert.match(css, /\.weekly-post-canvas-shell\.is-feed canvas/);
  assert.match(css, /\.post-art-canvas-shell\.is-reels canvas/);
});

test("rodapé apresenta um único CTA textual sem botão falso", () => {
  assert.match(panel, /Veja todas as novidades em /);
  assert.match(panel, /www\.olacarlopolis\.com/);
  assert.doesNotMatch(panel, /Acesse agora/);
  assert.doesNotMatch(panel, /drawWeeklyPostAccessLine/);
});

test("versão da central acompanha a publicação", () => {
  assert.match(html, /painel\.css\?v=637/);
  assert.match(html, /painel\.js\?v=947/);
  assert.match(panel, /numero: 958/);
  assert.match(panel, /label: "v958"/);
});
