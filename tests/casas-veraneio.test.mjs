import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publicHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const publicJs = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const publicCss = readFileSync(new URL("../casas-veraneio.css", import.meta.url), "utf8");
const adminHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const adminJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");
const adminCss = readFileSync(new URL("../admin/casas-veraneio-admin.css", import.meta.url), "utf8");

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
  assert.match(publicHtml, /casas-veraneio\.css\?v=5/);
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

test("pagina e propriedades possuem compartilhamento com link direto", () => {
  assert.match(publicJs, /id="vacationSharePage"/);
  assert.match(publicJs, /data-vacation-share=/);
  assert.match(publicJs, /url\.searchParams\.set\("item", "casa-veraneio"\)/);
  assert.match(publicJs, /sharedParams\.get\("item"\) === "casa-veraneio"/);
});

test("seletor compacto usa o nome Cards", () => {
  assert.match(publicJs, /<span>Cards<\/span>/);
  assert.doesNotMatch(publicJs, /<span>2 por linha<\/span>/);
});

test("galeria ampliada navega por setas teclado e gesto lateral", () => {
  assert.match(publicJs, /function openVacationImageViewer/);
  assert.match(publicJs, /data-vacation-viewer-prev/);
  assert.match(publicJs, /event\.key === "ArrowLeft"/);
  assert.match(publicJs, /pointerdown/);
  assert.match(publicJs, /Math\.abs\(distance\) >= 45/);
});

test("modal mobile exibe fotos completas", () => {
  assert.match(publicCss, /@media \(max-width: 700px\)[\s\S]*\.vacation-modal-gallery img \{[\s\S]*object-fit: contain;/);
  assert.match(publicCss, /scroll-snap-type: x mandatory/);
});

test("painel permite marcar disponibilidade alugado e manutencao por dia", () => {
  assert.match(adminHtml, /id="vacationRentalCalendarGrid"/);
  assert.match(adminHtml, /data-vacation-calendar-status="disponivel"/);
  assert.match(adminHtml, /data-vacation-calendar-status="alugado"/);
  assert.match(adminHtml, /data-vacation-calendar-status="manutencao"/);
  assert.match(adminJs, /function renderVacationRentalCalendar/);
  assert.match(adminJs, /calendarioDisponibilidade: \{ \.\.\.vacationRentalCalendar \}/);
  assert.match(adminJs, /delete vacationRentalCalendar\[date\]/);
  assert.match(adminCss, /vacation-calendar-grid button\.is-rented \{ background: #dc3545; \}/);
  assert.match(adminCss, /vacation-calendar-grid button\.is-maintenance \{ background: #2775d7; \}/);
});

test("site publico abre calendario pelo icone de cada propriedade", () => {
  assert.match(publicJs, /class="vacation-calendar-action"/);
  assert.match(publicJs, /data-vacation-calendar=/);
  assert.match(publicJs, /function openVacationAvailabilityCalendar/);
  assert.match(publicJs, /calendarioDisponibilidade/);
  assert.match(publicCss, /vacation-availability-grid \.is-available \{ background: #22a447; \}/);
  assert.match(publicCss, /vacation-availability-grid \.is-rented \{ background: #dc3545; \}/);
  assert.match(publicCss, /vacation-availability-grid \.is-maintenance \{ background: #2775d7; \}/);
});

test("calendarios possuem navegacao mensal e legenda acessivel", () => {
  assert.match(adminHtml, /id="vacationCalendarPrevious"/);
  assert.match(adminHtml, /id="vacationCalendarNext"/);
  assert.match(publicJs, /data-vacation-month-previous/);
  assert.match(publicJs, /data-vacation-month-next/);
  assert.match(publicJs, /aria-label="Dia ' \+ day \+ ', ' \+ label/);
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

test("painel cadastra classificacao finalidades capacidades e comodidades ampliadas", () => {
  assert.ok(adminHtml.includes('value="casa_veraneio"'));
  assert.ok(adminHtml.includes('value="espaco_eventos"'));
  assert.ok(adminHtml.includes('id="vacationRentalPurposes"'));
  assert.ok(adminHtml.includes('id="vacationRentalEventCapacity"'));
  assert.ok(adminHtml.includes('id="vacationRentalParkingCapacity"'));
  assert.ok(adminHtml.includes('value="rampa_barco"'));
  assert.ok(adminHtml.includes('value="area_fogueira"'));
  assert.ok(adminJs.includes('finalidades: [...document.querySelectorAll("#vacationRentalPurposes input:checked")]'));
  assert.ok(adminJs.includes("capacidadeEventos:"));
  assert.ok(adminJs.includes("capacidadeEstacionamento:"));
});

test("painel salva dados estruturados de eventos represa e pesca", () => {
  assert.ok(adminJs.includes("eventos: {"));
  assert.ok(adminJs.includes("aceitaCasamentos:"));
  assert.ok(adminJs.includes("permiteSom:"));
  assert.ok(adminJs.includes("capacidadeMaxima:"));
  assert.ok(adminJs.includes("represaPesca: {"));
  assert.ok(adminJs.includes("beiraRepresa:"));
  assert.ok(adminJs.includes("rampaBarco:"));
  assert.ok(adminJs.includes("distanciaAgua:"));
  assert.ok(adminJs.includes("vacationRentalAcceptsCorporateEvents"));
  assert.ok(adminJs.includes("vacationRentalBoatStorage"));
});

test("catalogo filtra novos dados e apresenta todos no detalhe", () => {
  assert.ok(publicJs.includes('id="vacationPublicType"'));
  assert.ok(publicJs.includes('id="vacationPublicPurpose"'));
  assert.ok(publicJs.includes('id="vacationPublicEventCapacity"'));
  assert.ok(publicJs.includes('id="vacationPublicParkingCapacity"'));
  assert.ok(publicJs.includes('id="vacationPublicEvent"'));
  assert.ok(publicJs.includes('id="vacationPublicReservoir"'));
  assert.ok(publicJs.includes("vacationPublicTypeKey(item) === type"));
  assert.ok(publicJs.includes("events[eventFeature] === true"));
  assert.ok(publicJs.includes("reservoir[reservoirFeature] === true"));
  assert.ok(publicJs.includes("<h3>Festas e eventos</h3>"));
  assert.ok(publicJs.includes("<h3>Represa e pesca</h3>"));
});

test("SEO das casas usa titulo descricao url e imagem principal", () => {
  assert.ok(publicJs.includes("Casas de Veraneio em Carlópolis PR | Olá Carlópolis"));
  assert.ok(publicJs.includes("vacationSeoDescription"));
  assert.ok(publicJs.includes('meta[property="og:image"]'));
  assert.ok(publicJs.includes("vacationPublicImages(item)[0]"));
  assert.ok(publicJs.includes('link[rel="canonical"]'));
});

test("versoes dos ativos das casas foram atualizadas", () => {
  assert.ok(publicHtml.includes("casas-veraneio.css?v=5"));
  assert.ok(adminHtml.includes("casas-veraneio-admin.css?v=4"));
  assert.ok(publicCss.includes("2026-09-02_v5"));
  assert.ok(adminCss.includes("2026-09-02_v4"));
});