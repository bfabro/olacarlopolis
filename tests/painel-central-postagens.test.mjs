import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("resumo semanal usa novidades reais com período e limite seguro", () => {
  assert.match(panel, /getPanelSnapshot\("novidades"/);
  assert.match(panel, /function weeklyPostItems/);
  assert.match(panel, /Últimos 7 dias/);
  assert.match(panel, /Últimos 14 dias/);
  assert.match(panel, /Últimos 30 dias/);
  assert.match(panel, /const CENTRAL_POST_MAX_ITEMS = 6/);
  assert.match(panel, /const WEEKLY_POST_MIN_ITEMS = 4/);
  assert.match(panel, /const WEEKLY_POST_MAX_ITEMS = 10/);
  assert.match(panel, /id="weeklyPostMaxItems"/);
  assert.match(panel, /function weeklyPostLimit/);
  assert.match(panel, /weeklyPostSelectedIds\.size >= itemLimit/);
  assert.match(panel, /\.slice\(0, weeklyPostLimit\(\)\)/);
});

test("vitrine permite seleção manual e aleatória de comércios reais", () => {
  assert.match(panel, /function commercePostClients/);
  assert.match(panel, /storyClientImages\(client\)/);
  assert.match(panel, /function randomCommercePostSelection/);
  assert.match(panel, /Math\.random\(\)/);
  assert.match(panel, /data-commerce-post-id/);
  assert.match(panel, /commercePostSelectedIds\.size >= CENTRAL_POST_MAX_ITEMS/);
});

test("artes oferecem Feed e Story, prévia e download PNG", () => {
  assert.match(panel, /width: 1080, height: 1080/);
  assert.match(panel, /width: 1080, height: 1920/);
  assert.match(panel, /weeklyPostCanvas/);
  assert.match(panel, /commercePostCanvas/);
  assert.match(panel, /canvasParaBlob/);
  assert.match(panel, /baixarBlobCanvas/);
  assert.match(css, /\.post-central-generator/);
  assert.match(css, /@media \(max-width: 680px\)/);
});

test("novidades da semana seguem o modelo editorial e levam a logo ao topo direito", () => {
  assert.match(panel, /function drawWeeklyPostHeader/);
  assert.match(panel, /function drawWeeklyLogoTransparent/);
  assert.match(panel, /const logoX = format\.width - logoSize/);
  assert.match(panel, /const logoY = vertical \? 34 : 22/);
  assert.match(panel, /drawWeeklyLogoTransparent\(ctx, assets\.siteLogo, logoX, logoY/);
  assert.doesNotMatch(panel, /preencherRoundRect\(ctx, logoX - 8/);
  assert.match(panel, /carregarImagemCanvas\("\.\.\/images\/turismo\/ponte\.jpg"\)/);
  assert.match(panel, /desenharImagemCover\(ctx, assets\.headerImage, 0, 0, format\.width, headerH\)/);
  assert.match(panel, /function drawWeeklyClientImage/);
  assert.match(panel, /ctx\.imageSmoothingQuality = "high"/);
  assert.match(panel, /desenharImagemCover\(ctx, image, x, y, width, height, radius\)/);
  assert.match(panel, /count <= 6 \? 3 : 4/);
  assert.match(panel, /count >= 9 \? 3/);
  assert.match(panel, /postArtDrawText\(ctx, weeklyPostItemTitle\(item\)/);
  assert.match(panel, /postArtDrawText\(ctx, weeklyPostItemDescription\(item\)/);
  assert.match(panel, /function weeklyPostStatus/);
  assert.match(panel, /label: "Novo"/);
  assert.match(panel, /label: "Atualizado"/);
  assert.match(panel, /Acesse agora/);
  assert.doesNotMatch(panel, /PORTAL LOCAL/);
  assert.doesNotMatch(panel, /preencherRoundRect\(ctx, 58, vertical \? 334 : 226/);
  assert.match(panel, /const footerGradient = ctx\.createLinearGradient/);
  assert.match(panel, /www\.olacarlopolis\.com/);
});

test("novidades oferecem dois fundos suaves com paletas próprias", () => {
  assert.match(panel, /const WEEKLY_POST_THEMES =/);
  assert.match(panel, /sereno:/);
  assert.match(panel, /claro:/);
  assert.doesNotMatch(panel, /entardecer:/);
  assert.match(panel, /data-weekly-post-theme/);
  assert.match(panel, /Fundo e cores/);
  assert.match(panel, /theme\.bodyStart/);
  assert.match(panel, /theme\.footerStart/);
  assert.match(css, /\.post-central-theme-toggle/);
});

test("versão da central acompanha a publicação", () => {
  assert.match(html, /painel\.css\?v=599/);
  assert.match(html, /painel\.js\?v=901/);
  assert.match(panel, /numero: 894/);
  assert.match(panel, /label: "v901"/);
});
