import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const style = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");

test("botao de fechar do menu publico aparece somente no mobile", () => {
  assert.match(script, /closeButton\.classList\.add\("close-btn"\)/);
  assert.match(style, /\.sidebar \.close-btn \{\s*display: none;/);
  assert.match(style, /@media screen and \(max-width: 768px\)[\s\S]*\.sidebar \.close-btn \{\s*display: grid;/);
});
