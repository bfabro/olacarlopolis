import test from "node:test";
import assert from "node:assert/strict";
import { intentFirstNarrationGuidance, normalizeNarrationTone } from "../src/creative-language.mjs";

test("v51 prioriza a intenção do vídeo em vez de descrever os quadros", () => {
  const guidance = intentFirstNarrationGuidance({
    style: "comercio_local",
    narration: { tone: "conversational" },
    director: { brief: "Apresentar a empresa de forma próxima e convidar moradores a conhecê-la." }
  }, { maximumWords: 58 });

  assert.match(guidance, /intuito central do vídeo/i);
  assert.match(guidance, /não transforme o roteiro em uma descrição literal/i);
  assert.match(guidance, /conversacional, humano, próximo e espontâneo/i);
  assert.match(guidance, /no máximo 58 palavras/i);
  assert.match(guidance, /aproximar a empresa das pessoas da cidade/i);
});

test("v51 normaliza o tom de voz para conversacional e humano", () => {
  assert.equal(normalizeNarrationTone("conversational"), "conversational");
  assert.equal(normalizeNarrationTone("desconhecido"), "conversational");
  assert.equal(normalizeNarrationTone("desconhecido", "warm"), "warm");
});
