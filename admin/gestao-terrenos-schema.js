export const TERRAIN_MANAGEMENT_SCHEMA_VERSION = "2026-08-31_v1";

export const OWNER_STATUSES = Object.freeze([
  "potencial_cliente",
  "cliente",
  "aguardando_resposta",
  "ativo",
  "nao_interessado",
  "inativo"
]);

export const TERRAIN_STATUSES = Object.freeze([
  "sem_informacao",
  "limpo",
  "monitorar",
  "pode_precisar_limpeza",
  "precisa_limpeza",
  "servico_agendado",
  "proprietario_desconhecido",
  "inativo"
]);

export const TERRAIN_MANAGEMENT_ENTITIES = Object.freeze({
  owners: Object.freeze({
    path: "terrenosProprietarios",
    fields: Object.freeze([
      "id", "nome", "cpf_cnpj", "telefone", "whatsapp", "email", "endereco",
      "numero", "bairro", "cidade", "estado", "cep", "observacoes", "origem_cliente",
      "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["cpf_cnpj", "email"]),
    statuses: OWNER_STATUSES
  }),
  terrains: Object.freeze({
    path: "terrenos",
    fields: Object.freeze([
      "id", "owner_id", "development_id", "apelido", "bairro", "rua", "numero",
      "quadra", "lote", "area_m2", "frente_m", "fundo_m", "matricula",
      "inscricao_imobiliaria", "latitude", "longitude", "google_maps_url", "observacoes",
      "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([
      "owner_id", "development_id", "matricula", "inscricao_imobiliaria", "latitude",
      "longitude", "google_maps_url"
    ]),
    statuses: TERRAIN_STATUSES
  }),
  developments: Object.freeze({
    path: "terrenosLoteamentos",
    fields: Object.freeze([
      "id", "nome", "bairro", "cidade", "descricao", "observacoes", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([])
  })
});
