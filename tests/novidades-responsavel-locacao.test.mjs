import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const siteJs = readFileSync(new URL("../script.js", import.meta.url), "utf8");

test("novidades ocultam cadastro generico de responsavel por locacao", () => {
  assert.ok(siteJs.includes("function novidadePertenceAResponsavelLocacao"));
  assert.ok(siteJs.includes('tiposDiretos.includes("responsavellocacao")'));
  assert.ok(siteJs.includes("if (novidadePertenceAResponsavelLocacao(item)) return false;"));
});

test("novidade especifica da casa continua fora do filtro de cadastro generico", () => {
  assert.ok(siteJs.includes("if (!novidadeEhCadastroGenericoCliente(item)) return false;"));
  assert.ok(siteJs.includes('tipo.includes("casaveraneio")'));
});
