import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publicHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const publicJs = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const publicCss = readFileSync(new URL("../casas-veraneio.css", import.meta.url), "utf8");
const adminHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const adminJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");

test("menu publico posiciona Casas de veraneio antes de Onde Comer", () => {
  assert.ok(publicHtml.indexOf('id="menuCasasVeraneio"') > 0);
  assert.ok(publicHtml.indexOf('id="menuCasasVeraneio"') < publicHtml.indexOf('id="menuOndeComer"'));
  assert.match(publicJs, /\["Lazer e gastronomia", \[\s*"menuCasasVeraneio",\s*"menuOndeComer"/);
});

test("rota publica carrega somente registros ativos", () => {
  assert.match(publicJs, /h === "#casas-veraneio"/);
  assert.match(publicJs, /ref\("conteudosInformativos\/casasVeraneio"\)/);
  assert.match(publicJs, /if \(value\.status === "ativo"\)/);
});

test("catalogo inicia compacto e permite alternar para detalhes", () => {
  assert.match(publicJs, /savedMode === null \? true/);
  assert.match(publicJs, /casasVeraneioModoCompacto/);
  assert.match(publicHtml, /casas-veraneio\.css\?v=2/);
  assert.match(publicCss, /vacation-public-page\.is-compact/);
});

test("catalogo publico resolve os elementos antes de carregar os registros", () => {
  assert.match(publicJs, /async function mostrarCasasVeraneio\(\) \{\s*const \$ = \(id\) => document\.getElementById\(id\);/);
  assert.match(publicJs, /rentals = await carregarCasasVeraneioFirebase\(true\)/);
});

test("estado sem hospedagens e amigavel e oculta os controles de exibicao", () => {
  assert.match(publicJs, /if \(!rentals\.length\) \{[\s\S]*vacationPublicToolbar[\s\S]*Em breve, novas casas de veraneio/);
  assert.match(publicCss, /vacation-public-toolbar\.hidden \{ display: none !important; \}/);
  assert.match(publicCss, /vacation-public-empty-catalog/);
});

test("responsavel por locacao e salvo como cliente sem categoria", () => {
  assert.match(adminHtml, /option value="responsavel_locacao"/);
  assert.match(adminJs, /function isCategorylessClientType[\s\S]*responsavel_locacao/);
  assert.match(adminJs, /const category = isCategorylessClientType\(tipoCliente\)\s*\? ""/);
  assert.match(adminJs, /syncClientCategoryByType/);
});

test("mobile compacto usa dois cards por linha", () => {
  assert.match(publicCss, /@media \(max-width: 700px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("painel expoe flag propria sem depender da categoria", () => {
  assert.match(adminHtml, /value="casas_veraneio"/);
  assert.match(adminJs, /function canAccessVacationRentals\(\)[\s\S]*hasPermission\("casas_veraneio"\)/);
  assert.doesNotMatch(adminJs, /canAccessVacationRentals\(\)[\s\S]{0,120}categoria/);
});

test("cliente ve e altera somente propriedades vinculadas", () => {
  assert.match(adminJs, /state\.casasVeraneio = state\.casasVeraneio\.filter\(itemBelongsToCurrentClient\)/);
  assert.match(adminJs, /original \|\| !itemBelongsToCurrentClient\(original\)/);
  assert.match(adminJs, /clienteId: clientId \|\| ""/);
});

test("cadastro aceita varios registros e varias imagens", () => {
  assert.match(adminJs, /push\(ref\(db, "conteudosInformativos\/casasVeraneio"\)\)\.key/);
  assert.match(adminHtml, /id="vacationRentalImagesUpload"[^>]*multiple/);
  assert.match(adminJs, /state\.vacationRentalPendingFiles\.push\(\.\.\.files\)/);
});

test("foto nova escolhida como capa permanece na primeira posicao ao salvar", () => {
  assert.match(adminJs, /state\.vacationRentalPendingCover = true/);
  assert.match(adminJs, /state\.vacationRentalPendingCover\s*\? \[\.\.\.uploaded, \.\.\.state\.vacationRentalImages\]/);
  assert.match(adminJs, /payload\.imagem = payload\.imagens\[0\]/);
});

test("Admin Master recebe a permissao e visualiza todos os registros", () => {
  assert.equal((adminJs.match(/casas_veraneio: true/g) || []).length, 2);
  assert.match(adminJs, /if \(!canManageClients\(\)\) \{\s*state\.casasVeraneio = state\.casasVeraneio\.filter/);
});
