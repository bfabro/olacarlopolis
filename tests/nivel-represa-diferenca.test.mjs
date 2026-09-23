import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("Represa compara os dois últimos dias com medição", () => {
  assert.match(script, /function diferencaCampoRepresa\(atual, anterior, campo\)/);
  assert.match(script, /const ultimoDia = dadosDiarios\.at\(-1\)/);
  assert.match(script, /const diaAnterior = dadosDiarios\.at\(-2\)/);
  assert.match(script, /O que mudou de um dia para o outro/);
  assert.match(script, /campo: 'cota'.*unidade: 'm'/);
  assert.match(script, /campo: 'volume'.*unidade: 'p\.p\.'/);
  assert.match(script, /campo: 'afluencia'.*unidade: 'm³\/s'/);
  assert.match(script, /campo: 'defluencia'.*unidade: 'm³\/s'/);
});

test("histórico apresenta diferença entre cada registro", () => {
  assert.match(script, /<th>Diferença<\/th>/);
  assert.match(script, /data-label="Diferença"/);
  assert.match(script, /represa-table-delta/);
  assert.match(style, /\.represa-table-delta\.up/);
  assert.match(style, /\.represa-table-delta\.down/);
});

test("gráfico de evolução possui animação acessível", () => {
  assert.match(script, /represa-chart-latest-ring/);
  assert.match(script, /--point-index:/);
  assert.match(style, /@keyframes represaLineDraw/);
  assert.match(style, /@keyframes represaPointIn/);
  assert.match(style, /@keyframes represaLatestPulse/);
  assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(style, /stroke: url\(#represaLineGradient\)/);
});
