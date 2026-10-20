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
  assert.match(panel, /weeklyPostSelectedIds\.size >= CENTRAL_POST_MAX_ITEMS/);
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

test("versão da central acompanha a publicação", () => {
  assert.match(html, /painel\.css\?v=593/);
  assert.match(html, /painel\.js\?v=895/);
  assert.match(panel, /numero: 888/);
  assert.match(panel, /label: "v895"/);
});
