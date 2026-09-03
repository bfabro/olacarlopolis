import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");

function trechoFuncao(inicio, fim) {
  const start = script.indexOf(inicio);
  const end = script.indexOf(fim, start);
  assert.ok(start >= 0, `funcao ausente: ${inicio}`);
  assert.ok(end > start, `limite da funcao ausente: ${fim}`);
  return script.slice(start, end);
}

function validarControlesUnicos(trecho, nome) {
  assert.equal(
    (trecho.match(/data-item-modal-share/g) || []).length,
    1,
    `${nome} deve renderizar somente um botao de compartilhamento`
  );
  assert.equal(
    (trecho.match(/<button[^>]+class="[^"]*imovel-detalhes-fechar[^"]*"/g) || []).length,
    1,
    `${nome} deve renderizar somente um botao de fechar`
  );
}

test("modal de imovel possui controles unicos de compartilhar e fechar", () => {
  const trecho = trechoFuncao("function abrirModalDetalhesImovel", "function cardImovelHTML");
  validarControlesUnicos(trecho, "modal de imovel");
  assert.ok(trecho.includes('modal.querySelector(".imovel-detalhes-fechar")?.addEventListener("click", fechar)'));
});

test("modal de automovel possui controles unicos de compartilhar e fechar", () => {
  const trecho = trechoFuncao("function abrirModalDetalhesAutomovel", "function configurarDetalhesAutomoveisEmBox");
  validarControlesUnicos(trecho, "modal de automovel");
  assert.ok(trecho.includes('modal.querySelector(".auto-detalhes-fechar")?.addEventListener("click", fechar)'));
});
