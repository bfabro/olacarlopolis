export const TERRAIN_MANAGEMENT_SCHEMA_VERSION = "2026-08-31_v2";

export const OWNER_STATUSES = Object.freeze([
  "potencial_cliente",
  "cliente",
  "aguardando_resposta",
  "ativo",
  "nao_interessado",
  "inativo"
]);

export const OWNER_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "potencial_cliente", label: "Potencial cliente", tone: "potential" }),
  Object.freeze({ value: "cliente", label: "Cliente", tone: "client" }),
  Object.freeze({ value: "aguardando_resposta", label: "Aguardando resposta", tone: "waiting" }),
  Object.freeze({ value: "ativo", label: "Cliente ativo", tone: "active" }),
  Object.freeze({ value: "nao_interessado", label: "N\u00e3o interessado", tone: "not-interested" }),
  Object.freeze({ value: "inativo", label: "Inativo", tone: "inactive" })
]);

export const OWNER_ORIGIN_OPTIONS = Object.freeze([
  Object.freeze({ value: "indicacao", label: "Indica\u00e7\u00e3o" }),
  Object.freeze({ value: "whatsapp", label: "WhatsApp" }),
  Object.freeze({ value: "instagram", label: "Instagram" }),
  Object.freeze({ value: "ola_carlopolis", label: "Ol\u00e1 Carl\u00f3polis" }),
  Object.freeze({ value: "cliente_antigo", label: "Cliente antigo" }),
  Object.freeze({ value: "prospeccao", label: "Prospec\u00e7\u00e3o" }),
  Object.freeze({ value: "outro", label: "Outro" })
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
      "id", "nome", "cpf_cnpj", "telefone", "whatsapp", "telefone_secundario", "email", "endereco",
      "numero", "bairro", "cidade", "estado", "cep", "observacoes", "origem_cliente",
      "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["cpf_cnpj", "telefone_secundario", "email"]),
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

const OWNER_ORIGIN_VALUES = new Set(OWNER_ORIGIN_OPTIONS.map((item) => item.value));
const OWNER_STATUS_VALUES = new Set(OWNER_STATUS_OPTIONS.map((item) => item.value));

export function normalizeTerrainOwnerInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const owner = {
    nome: value("nome"),
    cpf_cnpj: value("cpf_cnpj"),
    telefone: value("telefone"),
    whatsapp: value("whatsapp"),
    telefone_secundario: value("telefone_secundario"),
    email: value("email").toLowerCase(),
    endereco: value("endereco"),
    numero: value("numero"),
    bairro: value("bairro"),
    cidade: value("cidade"),
    estado: value("estado").toUpperCase().slice(0, 2),
    cep: value("cep"),
    observacoes: value("observacoes"),
    origem_cliente: OWNER_ORIGIN_VALUES.has(value("origem_cliente")) ? value("origem_cliente") : "outro",
    status: OWNER_STATUS_VALUES.has(value("status")) ? value("status") : "potencial_cliente"
  };
  const required = ["nome", "telefone", "whatsapp", "endereco", "numero", "bairro", "cidade", "estado", "cep"];
  const missing = required.filter((key) => !owner[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  return owner;
}

export function buildTerrainOwnerRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O proprietario precisa de um id.");
  const normalized = normalizeTerrainOwnerInput(input);
  return {
    id,
    ...normalized,
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
}

export function normalizeTerrainOwnerSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function terrainOwnerRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, owner]) => ({ id, ...(owner || {}) }));
  return list
    .filter((owner) => owner?.id)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

export function filterTerrainOwners(records, { name = "", phone = "", status = "" } = {}) {
  const normalizedName = normalizeTerrainOwnerSearch(name);
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  return terrainOwnerRecords(records).filter((owner) => {
    const matchesName = !normalizedName || normalizeTerrainOwnerSearch(owner.nome).includes(normalizedName);
    const ownerPhones = [owner.telefone, owner.whatsapp, owner.telefone_secundario]
      .map((value) => String(value || "").replace(/\D/g, ""))
      .join(" ");
    const matchesPhone = !phoneDigits || ownerPhones.includes(phoneDigits);
    const matchesStatus = !status || owner.status === status;
    return matchesName && matchesPhone && matchesStatus;
  });
}

export function terrainOwnerLinkedTerrains(ownerId, terrains = {}) {
  const list = Array.isArray(terrains)
    ? terrains
    : Object.entries(terrains || {}).map(([id, terrain]) => ({ id, ...(terrain || {}) }));
  return list.filter((terrain) => String(terrain.owner_id || "") === String(ownerId || ""));
}

export function canDeleteTerrainOwner(ownerId, terrains = {}) {
  return terrainOwnerLinkedTerrains(ownerId, terrains).length === 0;
}

export function terrainOwnerStatusMeta(status) {
  return OWNER_STATUS_OPTIONS.find((item) => item.value === status) || OWNER_STATUS_OPTIONS[0];
}

export function terrainOwnerOriginLabel(origin) {
  return OWNER_ORIGIN_OPTIONS.find((item) => item.value === origin)?.label || "Outro";
}

export function terrainOwnerWhatsappUrl(owner = {}) {
  let digits = String(owner.whatsapp || owner.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

export function formatTerrainOwnerDocument(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatTerrainOwnerCep(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}
