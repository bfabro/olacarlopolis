import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTerrainOpportunityActionUpdate,
  filterTerrainOpportunities,
  terrainOpportunityRecords,
  terrainOpportunityWhatsappUrl
} from "../admin/gestao-terrenos-schema.js";

const data = {
  owners: {
    owner1: { id: "owner1", nome: "Maria Silva", whatsapp: "(43) 99999-0000" },
    owner2: { id: "owner2", nome: "João Souza", whatsapp: "(43) 98888-0000", ultimo_contato_em: "2026-08-20" },
    owner3: { id: "owner3", nome: "Ana Lima", whatsapp: "(43) 97777-0000", ultimo_contato_em: "2026-08-30" }
  },
  developments: { dev1: { id: "dev1", nome: "Jardim das Flores" } },
  terrains: {
    t1: { id: "t1", owner_id: "owner1", development_id: "dev1", apelido: "Terreno da esquina", bairro: "Centro", rua: "A", numero: "1", quadra: "A", lote: "1", area_m2: 100, frente_m: 10, fundo_m: 10, grau_dificuldade: "facil", altura_mato: "ate_30_cm", observacoes: "", status: "precisa_limpeza", ultima_limpeza_em: "2026-05-01", proxima_vistoria_em: "2026-08-31" },
    t2: { id: "t2", owner_id: "owner2", apelido: "Lote vazio", bairro: "Centro", rua: "B", numero: "2", quadra: "B", lote: "2", area_m2: 150, frente_m: 10, fundo_m: 15, grau_dificuldade: "facil", altura_mato: "ate_30_cm", observacoes: "", status: "sem_informacao" },
    t3: { id: "t3", development_id: "dev1", apelido: "Sem dono", bairro: "Centro", rua: "C", numero: "3", quadra: "C", lote: "3", area_m2: 120, frente_m: 10, fundo_m: 12, grau_dificuldade: "facil", altura_mato: "ate_30_cm", observacoes: "", status: "proprietario_desconhecido", ultima_limpeza_em: "2026-08-15", proxima_vistoria_em: "2026-09-05" },
    t4: { id: "t4", owner_id: "owner3", development_id: "dev1", apelido: "Lote 4", bairro: "Centro", rua: "D", numero: "4", quadra: "D", lote: "4", area_m2: 200, frente_m: 10, fundo_m: 20, grau_dificuldade: "facil", altura_mato: "ate_30_cm", observacoes: "", status: "limpo", ultima_limpeza_em: "2026-08-01", proxima_vistoria_em: "2026-09-20" },
    t5: { id: "t5", owner_id: "owner1", apelido: "Adiado", bairro: "Centro", rua: "E", numero: "5", quadra: "E", lote: "5", area_m2: 100, frente_m: 10, fundo_m: 10, grau_dificuldade: "facil", altura_mato: "ate_30_cm", observacoes: "", status: "precisa_limpeza", oportunidade_nao_precisa_ate: "2026-10-01" }
  },
  inspections: {
    i1: { id: "i1", terrain_id: "t1", data: "2026-08-30", hora: "10:00", precisa_limpeza: true, recomendar_contato: true }
  },
  budgets: {
    b1: { id: "b1", terrain_id: "t1", owner_id: "owner1", data: "2026-08-31", valor: 600, status: "enviado", numero: "ORC-1" },
    b2: { id: "b2", terrain_id: "t1", owner_id: "owner1", data: "2026-09-01", valor: 0, status: "rascunho", numero: "ORC-2" }
  },
  services: {
    s1: { id: "s1", terrain_id: "t1", data_prevista: "2026-08-01", data_realizada: "2026-08-01", area_m2: 100, valor_cobrado: 500, status: "concluido" },
    s2: { id: "s2", terrain_id: "t2", data_prevista: "2026-08-02", data_realizada: "2026-08-02", area_m2: 0, valor_cobrado: 9000, status: "concluido" }
  }
};

test("gera oportunidades cruzando vistoria, atraso, histórico, orçamento e contato", () => {
  const opportunities = terrainOpportunityRecords(data, "2026-09-01");
  assert.deepEqual(new Set(opportunities.map((item) => item.id)), new Set(["t1", "t2", "t3", "t4"]));
  const first = opportunities.find((item) => item.id === "t1");
  assert.equal(first.proprietario, "Maria Silva");
  assert.equal(first.loteamento, "Jardim das Flores");
  assert.equal(first.dias_desde_ultima_limpeza, 123);
  assert.equal(first.ultimo_valor, 600);
  assert.equal(first.status, "precisa_limpeza");
  assert.equal(first.flags.orcamento_pendente, true);
  assert.equal(opportunities.find((item) => item.id === "t4").valor_estimado, 1000);
});

test("aplica todos os filtros operacionais", () => {
  const opportunities = terrainOpportunityRecords(data, "2026-09-01");
  assert.deepEqual(filterTerrainOpportunities(opportunities, "atrasados").map((item) => item.id), ["t1"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "proximos_7_dias").map((item) => item.id), ["t3"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "proximos_30_dias").map((item) => item.id), ["t4"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "precisa_limpeza").map((item) => item.id), ["t1"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "nunca_limpos").map((item) => item.id), ["t2"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "proprietario_desconhecido").map((item) => item.id), ["t3"]);
  assert.deepEqual(filterTerrainOpportunities(opportunities, "orcamento_pendente").map((item) => item.id), ["t1"]);
});

test("cria mensagem pronta de WhatsApp com dados reais", () => {
  const opportunity = terrainOpportunityRecords(data, "2026-09-01").find((item) => item.id === "t1");
  const url = terrainOpportunityWhatsappUrl(opportunity);
  assert.match(url, /^https:\/\/wa\.me\/5543999990000\?text=/);
  const message = decodeURIComponent(url.split("?text=")[1]);
  assert.match(message, /Maria Silva/);
  assert.match(message, /Jardim das Flores/);
  assert.match(message, /quadra A/);
  assert.match(message, /R\$ 600,00/);
});

test("gera updates das ações de contato e não precisa ainda", () => {
  assert.deepEqual(buildTerrainOpportunityActionUpdate("contact", { today: "2026-09-01" }), { ultimo_contato_em: "2026-09-01" });
  assert.deepEqual(buildTerrainOpportunityActionUpdate("not_needed", { today: "2026-09-01", days: 45 }), { oportunidade_nao_precisa_ate: "2026-10-16" });
  assert.throws(() => buildTerrainOpportunityActionUpdate("not_needed", { today: "2026-09-01", days: 0 }), /entre 1 e 365/);
});
