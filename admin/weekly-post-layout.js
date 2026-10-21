export const WEEKLY_POST_MIN_ITEMS = 4;
export const WEEKLY_POST_MAX_ITEMS = 6;
export const WEEKLY_POST_PAGE_SIZE = 6;
export const WEEKLY_POST_TITLE_SCALE_MIN = 90;
export const WEEKLY_POST_TITLE_SCALE_MAX = 145;

function plainText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalized(value) {
  return plainText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function weeklyPostTimestamp(item = {}) {
  return Number(item.dataCriacao || item.createdAt || item.updatedAt || item.dataAtualizacao || 0) || 0;
}

export function weeklyPostRecordKey(item = {}) {
  const type = plainText(item.destinoTipo || item.tipo || "registro");
  const target = plainText(item.itemId || item.destinoCardId || item.destinoId || item.registroId || item.id);
  return `${type}:${target || plainText(item.id)}`;
}

export function weeklyPostCategoryKey(item = {}) {
  const key = normalized(item.destinoTipo || item.tipoCliente || item.categoria || item.tipo || "outros") || "outros";
  if (key.includes("imovel") || key.includes("casa") || key.includes("terreno")) return "imoveis";
  if (key.includes("automovel") || key.includes("veiculo")) return "automoveis";
  if (key.includes("promoc") || key.includes("produto")) return "ofertas";
  if (key.includes("servico")) return "servicos";
  if (key.includes("cliente") || key.includes("comerc")) return "comercios";
  if (key.includes("evento") || key.includes("noticia")) return "conteudos";
  return key;
}

export function weeklyPostCardFields(item = {}) {
  const rawClient = plainText(item.estabelecimento || item.clienteNome || item.anunciante || item.empresaNome || item.nomeCliente);
  const rawTitle = plainText(item.tituloConteudo || item.destinoTitulo || item.nomeItem || item.titulo);
  const rawChange = plainText(item.acao || item.descricao);
  const client = normalized(rawClient) === normalized(rawTitle) ? "" : rawClient;
  const change = normalized(rawChange) === normalized(rawTitle) ? "" : rawChange;
  return { client, title: rawTitle, change };
}

export function weeklyPostEditableTitle(item = {}, overrides = {}) {
  const id = plainText(item.id);
  if (id && Object.prototype.hasOwnProperty.call(overrides, id)) return plainText(overrides[id]);
  return weeklyPostCardFields(item).title;
}

export function weeklyPostTitleScale(value = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.max(WEEKLY_POST_TITLE_SCALE_MIN, Math.min(WEEKLY_POST_TITLE_SCALE_MAX, Math.round(numeric)));
}

export function weeklyPostStatusKind(item = {}) {
  const source = normalized(`${item.acao || ""} ${item.titulo || ""} ${item.statusNovidade || ""}`);
  if (/(^|\s)(novo|nova|inserid|adicionad|cadastrad|incluid)/.test(source)) return "new";
  const created = Number(item.createdAt || item.dataCriacaoRegistro || 0) || 0;
  const updated = Number(item.updatedAt || item.dataAtualizacao || 0) || 0;
  return created > 0 && (!updated || Math.abs(updated - created) < 120000) ? "new" : "updated";
}

export function weeklyPostUniqueItems(items = []) {
  const seen = new Set();
  return [...items]
    .filter(Boolean)
    .sort((a, b) => weeklyPostTimestamp(b) - weeklyPostTimestamp(a))
    .filter((item) => {
      const key = weeklyPostRecordKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function weeklyPostDiverseItems(items = [], limit = WEEKLY_POST_MAX_ITEMS, previousIds = []) {
  const previous = new Set(previousIds.map(String));
  const candidates = weeklyPostUniqueItems(items).sort((a, b) => {
    const previousDifference = Number(previous.has(String(a.id))) - Number(previous.has(String(b.id)));
    if (previousDifference) return previousDifference;
    const relevance = (item) => {
      const fields = weeklyPostCardFields(item);
      const image = item.imagemPrincipal || item.fotoPrincipal || item.imagem || item.image || item.foto || item.imagens?.[0];
      return Number(Boolean(image)) * 3 + Number(Boolean(fields.client)) + Number(Boolean(fields.title)) + Number(Boolean(fields.change));
    };
    return (weeklyPostTimestamp(b) + relevance(b) * 60000) - (weeklyPostTimestamp(a) + relevance(a) * 60000);
  });
  const groups = new Map();
  candidates.forEach((item) => {
    const key = weeklyPostCategoryKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const selected = [];
  while (selected.length < limit && [...groups.values()].some((group) => group.length)) {
    for (const group of groups.values()) {
      const item = group.shift();
      if (item) selected.push(item);
      if (selected.length >= limit) break;
    }
  }
  return selected;
}

export function weeklyPostMoveOrder(order = [], id, direction) {
  const next = [...order].map(String);
  const index = next.indexOf(String(id));
  const target = index + Number(direction || 0);
  if (index < 0 || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function weeklyPostPages(items = [], pageSize = WEEKLY_POST_PAGE_SIZE) {
  const size = Math.max(1, Number(pageSize) || WEEKLY_POST_PAGE_SIZE);
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

export function weeklyPostGridLayout(format = {}, itemCount = 0) {
  const story = format.key === "reels" || Number(format.height) >= 1700;
  const width = Number(format.width) || 1080;
  const height = Number(format.height) || (story ? 1920 : 1350);
  const count = Math.max(1, Math.min(WEEKLY_POST_MAX_ITEMS, Number(itemCount) || 1));
  const columns = count === 1 ? 1 : 2;
  const rows = Math.ceil(count / columns);
  const margin = story ? 42 : 38;
  const gap = story ? 18 : 14;
  const headerHeight = story ? 332 : 232;
  const cardStartY = headerHeight + (story ? 18 : 14);
  const ctaHeight = story ? 82 : 70;
  const ctaY = story ? height - 336 : height - 118;
  const cardEndY = ctaY - (story ? 24 : 18);
  const cardWidth = columns === 1 ? Math.min(760, width - margin * 2) : (width - margin * 2 - gap) / 2;
  const cardHeight = (cardEndY - cardStartY - gap * Math.max(0, rows - 1)) / rows;
  return { story, width, height, count, columns, rows, margin, gap, headerHeight, cardStartY, cardEndY, cardWidth, cardHeight, ctaY, ctaHeight };
}

export function weeklyPostRecordReference(item = {}) {
  return {
    id: plainText(item.id),
    recordKey: weeklyPostRecordKey(item),
    link: plainText(item.link || item.url),
    destinationType: plainText(item.destinoTipo || item.tipo),
    destinationId: plainText(item.destinoId),
    itemId: plainText(item.itemId || item.destinoCardId),
    timestamp: weeklyPostTimestamp(item)
  };
}
