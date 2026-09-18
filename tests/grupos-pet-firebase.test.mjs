import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const start = source.indexOf("const gruposWhatsapp = [");
const end = source.indexOf("  function slug(", start);
const slugEnd = source.indexOf("  function escapeGrupoHtml(", end);
assert.ok(start >= 0 && end > start && slugEnd > end);
const script = source.slice(start, end) + source.slice(end, slugEnd) + "\nglobalThis.groups = gruposWhatsapp; globalThis.load = carregarGruposWhatsappFirebase;";

test("Amigos do Pet e Brecho aparecem apenas a partir do cadastro Firebase", async () => {
  let reads = 0;
  const records = [
    { key: "firebase-amigos", nome: "Amigos do Pet", link: "https://chat.whatsapp.com/amigos", status: "ativo" },
    { key: "firebase-brecho", nome: "Brecho Amigos do Pet", link: "https://chat.whatsapp.com/brecho", status: "ativo" }
  ];
  const sandbox = {
    console: { warn: (...args) => { throw new Error(args.join(" ")); } },
    esperarFirebaseDatabase: async () => ({
      ref: path => {
        assert.equal(path, "conteudosInformativos/gruposWhatsapp");
        return { once: async () => {
          reads++;
          return { forEach: callback => records.forEach(record => callback({ key: record.key, val: () => record })) };
        } };
      }
    })
  };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  assert.ok(!sandbox.groups.some(group => /amigos.*pet/i.test(group.nome)));
  assert.ok(sandbox.groups.some(group => group.id === "adegacuenca"), "outros grupos antigos não devem ser removidos");
  await sandbox.load();
  for (const record of records) {
    const matches = sandbox.groups.filter(group => group.nome === record.nome);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, record.key);
    assert.equal(matches[0].origemFirebase, true);
  }
  await sandbox.load();
  assert.equal(reads, 1);
});

