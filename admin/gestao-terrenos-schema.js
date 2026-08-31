export const TERRAIN_MANAGEMENT_SCHEMA_VERSION = "2026-08-31_v4";

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

export const TERRAIN_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "sem_informacao", label: "Sem informa\u00e7\u00e3o", tone: "neutral" }),
  Object.freeze({ value: "limpo", label: "Limpo", tone: "clean" }),
  Object.freeze({ value: "monitorar", label: "Monitorar", tone: "monitor" }),
  Object.freeze({ value: "pode_precisar_limpeza", label: "Pode precisar de limpeza", tone: "attention" }),
  Object.freeze({ value: "precisa_limpeza", label: "Precisa de limpeza", tone: "danger" }),
  Object.freeze({ value: "servico_agendado", label: "Servi\u00e7o agendado", tone: "scheduled" }),
  Object.freeze({ value: "proprietario_desconhecido", label: "Propriet\u00e1rio desconhecido", tone: "unknown" }),
  Object.freeze({ value: "inativo", label: "Inativo", tone: "inactive" })
]);

export const TERRAIN_DIFFICULTY_OPTIONS = Object.freeze([
  Object.freeze({ value: "facil", label: "F\u00e1cil" }),
  Object.freeze({ value: "medio", label: "M\u00e9dio" }),
  Object.freeze({ value: "dificil", label: "Dif\u00edcil" }),
  Object.freeze({ value: "muito_dificil", label: "Muito dif\u00edcil" })
]);

export const TERRAIN_GRASS_HEIGHT_OPTIONS = Object.freeze([
  Object.freeze({ value: "ate_30_cm", label: "At\u00e9 30 cm" }),
  Object.freeze({ value: "de_30_a_60_cm", label: "30 a 60 cm" }),
  Object.freeze({ value: "de_60_cm_a_1_m", label: "60 cm a 1 metro" }),
  Object.freeze({ value: "acima_1_m", label: "Acima de 1 metro" })
]);

export const TERRAIN_CHARACTERISTIC_OPTIONS = Object.freeze([
  Object.freeze({ value: "entulho", label: "Entulho" }),
  Object.freeze({ value: "pedras", label: "Pedras" }),
  Object.freeze({ value: "arvores", label: "\u00c1rvores" }),
  Object.freeze({ value: "cerca", label: "Cerca" }),
  Object.freeze({ value: "declive", label: "Declive" }),
  Object.freeze({ value: "construcao", label: "Constru\u00e7\u00e3o" }),
  Object.freeze({ value: "poste", label: "Poste" }),
  Object.freeze({ value: "objetos_abandonados", label: "Objetos abandonados" }),
  Object.freeze({ value: "possivel_presenca_animais", label: "Poss\u00edvel presen\u00e7a de animais" }),
  Object.freeze({ value: "acesso_dificil", label: "Acesso dif\u00edcil" }),
  Object.freeze({ value: "outro", label: "Outro" })
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
      "grau_dificuldade", "altura_mato", "caracteristicas", "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([
      "owner_id", "development_id", "matricula", "inscricao_imobiliaria", "latitude",
      "longitude", "google_maps_url", "caracteristicas"
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
const TERRAIN_STATUS_VALUES = new Set(TERRAIN_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_DIFFICULTY_VALUES = new Set(TERRAIN_DIFFICULTY_OPTIONS.map((item) => item.value));
const TERRAIN_GRASS_HEIGHT_VALUES = new Set(TERRAIN_GRASS_HEIGHT_OPTIONS.map((item) => item.value));
const TERRAIN_CHARACTERISTIC_VALUES = new Set(TERRAIN_CHARACTERISTIC_OPTIONS.map((item) => item.value));

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

function terrainNumber(value, field) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`Valor inv\u00e1lido para ${field}.`);
  }
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Valor inv\u00e1lido para ${field}.`);
  return number;
}

function terrainOptionalCoordinate(value, field, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Coordenada inv\u00e1lida para ${field}.`);
  }
  return number;
}

export function normalizeTerrainInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const selectedCharacteristics = Array.isArray(input.caracteristicas)
    ? input.caracteristicas
    : Object.entries(input.caracteristicas || {}).filter(([, selected]) => selected).map(([key]) => key);
  const characteristics = selectedCharacteristics.reduce((result, item) => {
    if (TERRAIN_CHARACTERISTIC_VALUES.has(item)) result[item] = true;
    return result;
  }, {});
  const terrain = {
    owner_id: value("owner_id") || null,
    development_id: value("development_id") || null,
    apelido: value("apelido"),
    bairro: value("bairro"),
    rua: value("rua"),
    numero: value("numero"),
    quadra: value("quadra"),
    lote: value("lote"),
    area_m2: terrainNumber(input.area_m2, "\u00e1rea"),
    frente_m: terrainNumber(input.frente_m, "frente"),
    fundo_m: terrainNumber(input.fundo_m, "fundo"),
    matricula: value("matricula") || null,
    inscricao_imobiliaria: value("inscricao_imobiliaria") || null,
    latitude: terrainOptionalCoordinate(input.latitude, "latitude", -90, 90),
    longitude: terrainOptionalCoordinate(input.longitude, "longitude", -180, 180),
    google_maps_url: value("google_maps_url") || null,
    observacoes: value("observacoes"),
    grau_dificuldade: TERRAIN_DIFFICULTY_VALUES.has(value("grau_dificuldade")) ? value("grau_dificuldade") : "",
    altura_mato: TERRAIN_GRASS_HEIGHT_VALUES.has(value("altura_mato")) ? value("altura_mato") : "",
    caracteristicas: Object.keys(characteristics).length ? characteristics : null,
    status: TERRAIN_STATUS_VALUES.has(value("status")) ? value("status") : "sem_informacao"
  };
  const required = [
    "apelido", "bairro", "rua", "numero", "quadra", "lote", "grau_dificuldade", "altura_mato"
  ];
  const missing = required.filter((key) => !terrain[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  if (terrain.google_maps_url && !/^https?:\/\//i.test(terrain.google_maps_url)) {
    throw new Error("O link do Google Maps precisa iniciar com http:// ou https://.");
  }
  return terrain;
}

export function buildTerrainRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O terreno precisa de um id.");
  return {
    id,
    ...normalizeTerrainInput(input),
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
}

export function terrainRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, terrain]) => ({ id, ...(terrain || {}) }));
  return list
    .filter((terrain) => terrain?.id)
    .sort((a, b) => {
      const byNeighborhood = String(a.bairro || "").localeCompare(String(b.bairro || ""), "pt-BR");
      if (byNeighborhood) return byNeighborhood;
      const byBlock = String(a.quadra || "").localeCompare(String(b.quadra || ""), "pt-BR", { numeric: true });
      if (byBlock) return byBlock;
      return String(a.lote || "").localeCompare(String(b.lote || ""), "pt-BR", { numeric: true });
    });
}

export function terrainOwnerName(terrain = {}, owners = {}) {
  return terrain.owner_id ? (owners?.[terrain.owner_id]?.nome || "Propriet\u00e1rio n\u00e3o encontrado") : "Sem propriet\u00e1rio";
}

export function terrainDevelopmentName(terrain = {}, developments = {}) {
  return terrain.development_id ? (developments?.[terrain.development_id]?.nome || "Loteamento n\u00e3o encontrado") : "Sem loteamento";
}

export function filterTerrains(records, filters = {}, owners = {}, developments = {}) {
  const search = normalizeTerrainOwnerSearch(filters.search);
  const neighborhood = normalizeTerrainOwnerSearch(filters.bairro);
  const block = normalizeTerrainOwnerSearch(filters.quadra);
  const lot = normalizeTerrainOwnerSearch(filters.lote);
  return terrainRecords(records).filter((terrain) => {
    const haystack = normalizeTerrainOwnerSearch([
      terrain.apelido, terrain.bairro, terrain.rua, terrain.numero, terrain.quadra, terrain.lote,
      terrain.matricula, terrain.inscricao_imobiliaria,
      terrainOwnerName(terrain, owners), terrainDevelopmentName(terrain, developments)
    ].filter(Boolean).join(" "));
    return (!search || haystack.includes(search))
      && (!filters.owner_id || terrain.owner_id === filters.owner_id)
      && (!filters.development_id || terrain.development_id === filters.development_id)
      && (!neighborhood || normalizeTerrainOwnerSearch(terrain.bairro) === neighborhood)
      && (!filters.status || terrain.status === filters.status)
      && (!block || normalizeTerrainOwnerSearch(terrain.quadra).includes(block))
      && (!lot || normalizeTerrainOwnerSearch(terrain.lote).includes(lot));
  });
}

export function terrainStatusMeta(status) {
  return TERRAIN_STATUS_OPTIONS.find((item) => item.value === status) || TERRAIN_STATUS_OPTIONS[0];
}

export function terrainDifficultyLabel(value) {
  return TERRAIN_DIFFICULTY_OPTIONS.find((item) => item.value === value)?.label || "-";
}

export function terrainGrassHeightLabel(value) {
  return TERRAIN_GRASS_HEIGHT_OPTIONS.find((item) => item.value === value)?.label || "-";
}

export function terrainCharacteristicLabels(characteristics = {}) {
  return TERRAIN_CHARACTERISTIC_OPTIONS
    .filter((item) => characteristics?.[item.value])
    .map((item) => item.label);
}

export function terrainMapsUrl(terrain = {}) {
  const explicitUrl = String(terrain.google_maps_url || "").trim();
  if (/^https?:\/\//i.test(explicitUrl)) return explicitUrl;
  if (terrain.latitude === "" || terrain.latitude === null || terrain.latitude === undefined) return "";
  if (terrain.longitude === "" || terrain.longitude === null || terrain.longitude === undefined) return "";
  const latitude = Number(terrain.latitude);
  const longitude = Number(terrain.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
