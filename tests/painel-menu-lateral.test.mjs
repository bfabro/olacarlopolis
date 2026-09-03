import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelHtml = readFileSync(new URL("../admin/painel.html", import.meta.url), "utf8");
const panelCss = readFileSync(new URL("../admin/painel.css", import.meta.url), "utf8");
const panelJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");

test("menu administrativo separa os acessos por temas coerentes", () => {
  [
    "Começar",
    "Criar e divulgar",
    "Cadastros",
    "Conteúdo público",
    "Anúncios e vitrines",
    "Relacionamento",
    "Gestão e relatórios",
    "Módulos especiais",
    "Configurações do site"
  ].forEach((titulo) => assert.ok(panelHtml.includes(titulo), `grupo ausente: ${titulo}`));
});

test("cada quadrante principal recebe uma identidade visual propria", () => {
  [
    "nav-theme-overview",
    "nav-theme-creation",
    "nav-theme-registry",
    "nav-theme-content",
    "nav-theme-listings",
    "nav-theme-relationship",
    "nav-theme-management",
    "nav-theme-special",
    "nav-theme-system"
  ].forEach((classe) => {
    assert.ok(panelHtml.includes(classe), `classe ausente no menu: ${classe}`);
    assert.ok(panelCss.includes(`.${classe} {`), `tema ausente no CSS: ${classe}`);
  });
});

test("submenus do cliente alternam cores e preservam contraste nos estados", () => {
  assert.match(panelCss, /client-module-sidebar-group:nth-child\(4n \+ 1\)/);
  assert.match(panelCss, /client-module-sidebar-group:nth-child\(4n \+ 2\)/);
  assert.match(panelCss, /client-module-sidebar-group:nth-child\(4n \+ 3\)/);
  assert.match(panelCss, /nav-admin-group > button\.active[\s\S]*color: #fff/);
});

test("ativos do painel usam as novas versoes sem cache antigo", () => {
  assert.ok(panelHtml.includes("painel.css?v=445"));
  assert.ok(panelHtml.includes("painel.js?v=660"));
});

test("mantem a area do parceiro visivel para o perfil correspondente", () => {
  assert.ok(
    panelJs.includes(`group.querySelector("[data-view='areaParceiro']")`),
    "o grupo da area do parceiro deve ser preservado pela regra de visibilidade"
  );
});

test("modulos especiais agrupam combustivel terrenos e xadrez", () => {
  const group = panelHtml.match(/<section class="nav-admin-group nav-theme-special"[\s\S]*?<\/section>/)?.[0] || "";
  assert.ok(group.includes('data-view="combustiveisConfig"'));
  assert.ok(group.includes('data-view="gestaoTerrenos"'));
  assert.ok(group.includes('data-view="xadrezConfig"'));
});

test("relacionamento reune beneficios e area do parceiro", () => {
  const group = panelHtml.match(/<section class="nav-admin-group nav-theme-relationship"[\s\S]*?<\/section>/)?.[0] || "";
  assert.ok(group.includes('data-view="beneficios"'));
  assert.ok(group.includes('data-view="areaParceiro"'));
});

test("produtos servicos notas e grupos possuem acessos diretos", () => {
  assert.ok(panelHtml.includes('data-view="produtosServicosClientes"'));
  assert.ok(panelHtml.includes('id="produtosServicosClientesView"'));
  assert.ok(panelJs.includes("renderStaffClientCatalogView"));
  assert.ok(panelHtml.includes('data-view="notaFalecimento"'));
  assert.ok(panelHtml.includes('id="notaFalecimentoView"'));
  assert.ok(panelHtml.includes('data-view="gruposWhatsapp"'));
  assert.ok(panelHtml.includes('id="gruposWhatsappView"'));
  assert.ok(!panelHtml.includes('data-view="informacoes"'));
  assert.ok(!panelHtml.includes("data-info-module-target"));
});
