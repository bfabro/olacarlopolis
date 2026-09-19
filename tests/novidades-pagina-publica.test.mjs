import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

function functionBody(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = /\n\s{2}(?:async )?function /.exec(script.slice(start + 1));
  return script.slice(start, next ? start + 1 + next.index : undefined);
}

test("home nao possui mais aba nem feed embutido de novidades", () => {
  assert.doesNotMatch(html, /data-target="novidades-cidade"/);
  assert.doesNotMatch(html, /id="secao-novidades-cidade"/);
  assert.equal((html.match(/id="novidadesCidadeFeed"/g) || []).length, 0);
  const refresh = functionBody("renderizarTelaAtualComDadosAdmin");
  assert.doesNotMatch(refresh.split("const h =")[0], /montarNovidadesCidade/);
});

test("acesso rapido abre a pagina exclusiva sem rolagem da home", () => {
  const quick = functionBody("abrirHomeQuickAction");
  const branch = quick.slice(quick.indexOf('if (action === "novidades")'), quick.indexOf('if (action === "cep")'));
  assert.match(branch, /mostrarNovidadesCidadePublicas\(\)/);
  assert.doesNotMatch(branch, /rolarParaCardInicial|botao-menu-topo|limparRotaParaSecaoInicial/);
  assert.match(script, /if \(h === "#novidades"\) \{ return mostrarNovidadesCidadePublicas\(\); \}/);
});

test("menu lateral e rota compartilham a mesma tela de novidades", () => {
  assert.match(html, /id="menuNovidadesCidade" href="#novidades"/);
  const page = functionBody("mostrarNovidadesCidadePublicas");
  assert.match(page, /area\.dataset\.currentRoute = "novidades"/);
  assert.match(page, /class="novidades-public-page"/);
  assert.match(page, /Toda atualização no portal você confere aqui!/);
  assert.match(page, /id="novidadesSemanaResumo"/);
  assert.match(page, /id="novidadesCidadeFeed"/);
  assert.match(page, /await montarNovidadesCidade\(\)/);
  assert.match(page, /window\.scrollTo\(\{ top: 0/);
  assert.match(css, /\.novidades-public-hero/);
  assert.match(css, /background: linear-gradient\(135deg, #a865ff, #6b22d6\)/);
  assert.match(script, /#menuNovidadesCidade/);
});
