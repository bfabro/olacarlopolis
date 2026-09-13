const createBlock = (id, lots, street, blockArea = "", lotArea = "", startLot = 1) => ({
  id: String(id), lots, street, blockArea, lotArea, startLot
});

const novoHorizonteIBlocks = [
  createBlock("A", 12, "Rua José Paula de Miranda", "5.166,00 m²", "180 a 234 m²", 2),
  createBlock("B", 11, "Rua José Paula de Miranda", "4.756,00 m²", "180 a 234 m²", 2),
  createBlock("C", 24, "Rua Lázara Maria Alves", "4.536,00 m²", "180 a 234 m²"),
  createBlock("D", 22, "Rua Lázara Maria Alves", "4.176,00 m²", "180 a 234 m²"),
  createBlock("E", 24, "Rua Tadashi Uto", "4.536,00 m²", "180 a 234 m²"),
  createBlock("F", 22, "Rua Tadashi Uto", "4.176,00 m²", "180 a 234 m²"),
  createBlock("G", 24, "Rua Silvio José Banik", "4.536,00 m²", "180 a 234 m²"),
  createBlock("H", 22, "Rua Silvio José Banik", "4.176,00 m²", "180 a 234 m²"),
  createBlock("I", 24, "Rua José Cândido Souza", "4.536,00 m²", "180 a 234 m²"),
  createBlock("J", 22, "Rua José Cândido Souza", "4.176,00 m²", "180 a 234 m²"),
  createBlock("K", 24, "Rua Benjamin Silva", "4.536,00 m²", "180 a 234 m²"),
  createBlock("L", 22, "Rua Benjamin Silva", "4.176,00 m²", "180 a 234 m²"),
  createBlock("M", 24, "Rua Evaristo Sanches Garcia", "4.536,00 m²", "180 a 234 m²"),
  createBlock("N", 22, "Rua Evaristo Sanches Garcia", "4.176,00 m²", "180 a 234 m²"),
  createBlock("O", 24, "Rua Maria Keder Soares", "4.536,00 m²", "180 a 234 m²"),
  createBlock("P", 22, "Rua Maria Keder Soares", "4.176,00 m²", "180 a 234 m²"),
  createBlock("Q", 19, "Rua Dr. Alberto Merhi Mansur", "3.877,14 m²", "180 a 234 m²"),
  createBlock("R", 22, "Rua Dr. Alberto Merhi Mansur", "4.176,00 m²", "180 a 234 m²"),
  createBlock("S", 4, "Rua Aristides Domiciano", "6.174,67 m²", "Área especial; conferir planta", 3)
];

const novoHorizonteIIBlocks = [
  createBlock("A", 11, "Rua José Paula de Miranda", "4.858,50 m²", "180 a 243 m²", 2),
  ...["B", "C", "D", "E", "F", "G", "H", "I", "J"].map((id, index) => (
    createBlock(id, 22, ["Rua Lázara Maria Alves", "Rua Tadashi Uto", "Rua Silvio José Banik", "Rua José Cândido Souza", "Rua Benjamin Silva", "Rua Evaristo Sanches Garcia", "Rua Maria Keder Soares", "Rua Dr. Alberto Merhi Mansur", "Rua Noêmia Antônia Varrasquim"][index], "4.266,00 m²", "180 a 243 m²")
  )),
  createBlock("K", 21, "Rua Zeni de Souza Lima", "4.188,67 m²", "180 a 243 m²"),
  createBlock("L", 3, "Rua Aristides Domiciano", "902,83 m²", "Conferir planta")
];

const novoHorizonteIIIBlocks = [
  createBlock("A", 9, "Rua José Paula de Miranda", "2.245,93 m²", "180 a 327 m²"),
  ...["B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map((id, index) => (
    createBlock(id, 22, ["Rua Lázara Maria Alves", "Rua Tadashi Uto", "Rua Silvio José Banik", "Rua José Cândido Souza", "Rua Benjamin Silva", "Rua Evaristo Sanches Garcia", "Rua Maria Keder Soares", "Rua Dr. Alberto Merhi Mansur", "Rua Noêmia Antônia Varrasquim", "Rua Zeni de Souza Lima"][index], "4.176,00 m²", "180 a 234 m²")
  )),
  createBlock("L", 20, "Rua Aristides Domiciano", "4.236,89 m²", "180 a 276 m²"),
  createBlock("M", 1, "Rua Lázara Maria Alves", "329,97 m²", "329,97 m²"),
  createBlock("N", 3, "Rua Zeni de Souza Lima", "651,14 m²", "180 a 235 m²"),
  createBlock("O", 3, "Rua Noêmia Antônia Varrasquim", "651,02 m²", "180 a 235 m²"),
  createBlock("P", 3, "Rua Dr. Alberto Merhi Mansur", "650,90 m²", "180 a 235 m²"),
  createBlock("Q", 3, "Rua Maria Keder Soares", "650,77 m²", "180 a 235 m²"),
  createBlock("R", 3, "Rua Evaristo Sanches Garcia", "650,66 m²", "180 a 235 m²"),
  createBlock("S", 3, "Rua Benjamin Silva", "650,53 m²", "180 a 235 m²"),
  createBlock("T", 3, "Rua José Cândido Souza", "650,41 m²", "180 a 235 m²"),
  createBlock("U", 3, "Rua Silvio José Banik", "650,29 m²", "180 a 235 m²"),
  createBlock("V", 3, "Rua Tadashi Uto", "650,16 m²", "180 a 235 m²"),
  createBlock("X", 4, "Rua Lázara Maria Alves", "775,21 m²", "180 a 235 m²")
];

const vilaRayBlocks = Array.from({ length: 20 }, (_, index) => (
  createBlock(index + 1, 30, "Confirmar na planta", "", "Área variável; conferir planta")
));

export const TERRAIN_INTERACTIVE_MAPS = [
  {
    id: "novo-horizonte-i",
    name: "Loteamento Residencial Novo Horizonte I",
    shortName: "Novo Horizonte I",
    neighborhood: "Novo Horizonte",
    image: "./assets/terrain-maps/novo-horizonte-i.webp",
    totalArea: "119.676,00 m²",
    declaredLots: 390,
    aliases: ["novo horizonte", "novo horizonte i", "novo horizonte 1"],
    blocks: novoHorizonteIBlocks
  },
  {
    id: "novo-horizonte-ii",
    name: "Loteamento Residencial Novo Horizonte II",
    shortName: "Novo Horizonte II",
    neighborhood: "Novo Horizonte",
    image: "./assets/terrain-maps/novo-horizonte-ii.webp",
    totalArea: "71.506,00 m²",
    declaredLots: 234,
    aliases: ["novo horizonte ii", "novo horizonte 2"],
    blocks: novoHorizonteIIBlocks
  },
  {
    id: "novo-horizonte-iii",
    name: "Loteamento Residencial Novo Horizonte III",
    shortName: "Novo Horizonte III",
    neighborhood: "Novo Horizonte",
    image: "./assets/terrain-maps/novo-horizonte-iii.webp",
    totalArea: "87.727,58 m²",
    declaredLots: 281,
    aliases: ["novo horizonte iii", "novo horizonte 3"],
    blocks: novoHorizonteIIIBlocks
  },
  {
    id: "vila-ray",
    name: "Loteamento Residencial Vila Ray",
    shortName: "Vila Ray",
    neighborhood: "Vila Ray",
    image: "./assets/terrain-maps/vila-ray.webp",
    totalArea: "131.272,00 m²",
    declaredLots: null,
    aliases: ["vila ray"],
    blocks: vilaRayBlocks,
    requiresLotConfirmation: true
  }
];

export function normalizeTerrainInteractiveMapName(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function terrainInteractiveMapById(mapId = "") {
  return TERRAIN_INTERACTIVE_MAPS.find((map) => map.id === mapId) || null;
}

export function terrainInteractiveMapForDevelopment(development = {}) {
  const developmentId = String(development.id || "").trim();
  const linkedMapId = String(
    development.mapa_interativo_id
    || development.interactive_map_id
    || (developmentId.startsWith("mapa-interativo-") ? developmentId.slice("mapa-interativo-".length) : "")
  ).trim();
  if (linkedMapId) return terrainInteractiveMapById(linkedMapId);
  const normalized = normalizeTerrainInteractiveMapName(development.nome || development.name || "");
  if (!normalized) return null;
  return TERRAIN_INTERACTIVE_MAPS.find((map) => map.aliases.some((alias) => normalized === alias || normalized.endsWith(` ${alias}`))) || null;
}

export function terrainInteractiveDevelopmentId(mapId = "") {
  return `mapa-interativo-${String(mapId).trim()}`;
}

export function buildTerrainInteractiveDevelopmentRecord(map, timestamp = Date.now()) {
  if (!map?.id) return null;
  return {
    id: terrainInteractiveDevelopmentId(map.id),
    nome: map.name,
    bairro: map.neighborhood,
    cidade: "Carlópolis",
    descricao: `Loteamento com mapa interativo publicado. Área total: ${map.totalArea}.`,
    observacoes: "Planta interativa usada como referência operacional; confirme os dados na documentação oficial.",
    planta_imagem_url: map.image,
    planta_imagem_path: null,
    planta_pdf_url: null,
    planta_pdf_path: null,
    mapa_interativo_id: map.id,
    origem: "mapa_interativo",
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function mergeTerrainInteractiveDevelopments(records = {}, timestamp = Date.now()) {
  const developments = { ...(records || {}) };
  const created = {};
  TERRAIN_INTERACTIVE_MAPS.forEach((map) => {
    const existingEntry = Object.entries(developments).find(([, development]) => (
      terrainInteractiveMapForDevelopment(development)?.id === map.id
    ));
    if (existingEntry) {
      const [id, development] = existingEntry;
      if (!development.id) developments[id] = { id, ...development };
      return;
    }
    const record = buildTerrainInteractiveDevelopmentRecord(map, timestamp);
    developments[record.id] = record;
    created[record.id] = record;
  });
  return { developments, created };
}

export function terrainInteractiveBlock(mapId, blockId) {
  const map = terrainInteractiveMapById(mapId);
  return map?.blocks.find((block) => block.id === String(blockId || "")) || null;
}

export function terrainInteractiveLotNumbers(mapId, blockId) {
  const block = terrainInteractiveBlock(mapId, blockId);
  return block ? Array.from({ length: block.lots }, (_, index) => String(index + block.startLot)) : [];
}

export function buildTerrainInteractiveSelection(mapId, blockId, lot) {
  const map = terrainInteractiveMapById(mapId);
  const block = terrainInteractiveBlock(mapId, blockId);
  const lotNumber = String(lot || "");
  if (!map || !block || !terrainInteractiveLotNumbers(mapId, blockId).includes(lotNumber)) return null;
  return {
    mapId: map.id,
    developmentName: map.name,
    shortName: map.shortName,
    neighborhood: map.neighborhood,
    block: block.id,
    lot: lotNumber,
    street: block.street,
    blockArea: block.blockArea,
    lotArea: block.lotArea,
    requiresLotConfirmation: map.requiresLotConfirmation === true,
    reference: `${map.shortName} · Quadra ${block.id} · Lote ${lotNumber}${block.street && block.street !== "Confirmar na planta" ? ` · ${block.street}` : ""}`
  };
}
