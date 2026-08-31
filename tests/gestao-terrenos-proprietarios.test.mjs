import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainOwnerRecord,
  canDeleteTerrainOwner,
  filterTerrainOwners,
  formatTerrainOwnerCep,
  formatTerrainOwnerDocument,
  terrainOwnerLinkedTerrains,
  terrainOwnerWhatsappUrl
} from "../admin/gestao-terrenos-schema.js";

const baseInput = {
  nome: "Maria da Silva",
  cpf_cnpj: "123.456.789-00",
  telefone: "(43) 3526-1000",
  whatsapp: "(43) 99999-1000",
  telefone_secundario: "",
  email: "MARIA@EXEMPLO.COM",
  endereco: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
  cidade: "Carlópolis",
  estado: "pr",
  cep: "86420-000",
  observacoes: "Contato pela manhã.",
  origem_cliente: "indicacao",
  status: "potencial_cliente"
};

test("cria um proprietário normalizado", () => {
  const owner = buildTerrainOwnerRecord(baseInput, { id: "owner-1", timestamp: 1000 });
  assert.equal(owner.id, "owner-1");
  assert.equal(owner.nome, "Maria da Silva");
  assert.equal(owner.email, "maria@exemplo.com");
  assert.equal(owner.estado, "PR");
  assert.equal(owner.created_at, 1000);
  assert.equal(owner.updated_at, 1000);
});

test("edita preservando a data de criação", () => {
  const existing = buildTerrainOwnerRecord(baseInput, { id: "owner-1", timestamp: 1000 });
  const edited = buildTerrainOwnerRecord(
    { ...baseInput, nome: "Maria Silva Souza", status: "cliente" },
    { id: "owner-1", existing, timestamp: 2000 }
  );
  assert.equal(edited.nome, "Maria Silva Souza");
  assert.equal(edited.status, "cliente");
  assert.equal(edited.created_at, 1000);
  assert.equal(edited.updated_at, 2000);
});

test("lista em ordem alfabética e pesquisa por nome", () => {
  const owners = {
    b: buildTerrainOwnerRecord({ ...baseInput, nome: "Zélia Alves" }, { id: "b", timestamp: 1 }),
    a: buildTerrainOwnerRecord({ ...baseInput, nome: "Álvaro Lima" }, { id: "a", timestamp: 1 })
  };
  const listed = filterTerrainOwners(owners);
  assert.deepEqual(listed.map((owner) => owner.id), ["a", "b"]);
  assert.deepEqual(filterTerrainOwners(owners, { name: "alvaro" }).map((owner) => owner.id), ["a"]);
});

test("pesquisa telefone e WhatsApp e filtra status", () => {
  const owners = {
    a: buildTerrainOwnerRecord(baseInput, { id: "a", timestamp: 1 }),
    b: buildTerrainOwnerRecord(
      { ...baseInput, telefone: "(43) 3526-2222", whatsapp: "(43) 98888-2222", status: "inativo" },
      { id: "b", timestamp: 1 }
    )
  };
  assert.deepEqual(filterTerrainOwners(owners, { phone: "999991000" }).map((owner) => owner.id), ["a"]);
  assert.deepEqual(filterTerrainOwners(owners, { status: "inativo" }).map((owner) => owner.id), ["b"]);
});

test("inativa sem perder os demais dados", () => {
  const existing = buildTerrainOwnerRecord(baseInput, { id: "a", timestamp: 1 });
  const inactive = buildTerrainOwnerRecord(
    { ...existing, status: "inativo" },
    { id: "a", existing, timestamp: 2 }
  );
  assert.equal(inactive.status, "inativo");
  assert.equal(inactive.nome, existing.nome);
});

test("conta relacionamentos e só libera exclusão sem terrenos", () => {
  const terrains = {
    t1: { id: "t1", owner_id: "a" },
    t2: { id: "t2", owner_id: "a" },
    t3: { id: "t3", owner_id: "b" }
  };
  assert.equal(terrainOwnerLinkedTerrains("a", terrains).length, 2);
  assert.equal(canDeleteTerrainOwner("a", terrains), false);
  assert.equal(canDeleteTerrainOwner("c", terrains), true);
});

test("gera link do WhatsApp e máscaras de documento", () => {
  assert.equal(terrainOwnerWhatsappUrl(baseInput), "https://wa.me/5543999991000");
  assert.equal(formatTerrainOwnerDocument("12345678900"), "123.456.789-00");
  assert.equal(formatTerrainOwnerCep("86420000"), "86420-000");
});
