// Atualizacao segura de precos e promocoes por link exclusivo - v6
export const config = { runtime: "edge" };


const DEFAULT_DATABASE_URL = "https://contadoracessos-default-rtdb.firebaseio.com";

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || globalThis.process?.env?.[name] || "";
}

function response(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff"
    }
  });
}

function safeId(value) {
  const result = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{1,90}$/.test(result) ? result : "";
}

function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index % Math.max(1, a.length)) || 0) ^ (b.charCodeAt(index % Math.max(1, b.length)) || 0);
  }
  return difference === 0;
}

function saoPauloDate(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp)).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function firebaseUrl(databaseUrl, databaseAuth, path = "") {
  const auth = databaseAuth ? `?auth=${encodeURIComponent(databaseAuth)}` : "";
  return `${databaseUrl}/${path}.json${auth}`;
}

async function firebaseJson(databaseUrl, databaseAuth, path, options = {}) {
  const result = await fetch(firebaseUrl(databaseUrl, databaseAuth, path), {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    cache: "no-store"
  });
  if (!result.ok) throw new Error(`Firebase respondeu HTTP ${result.status}.`);
  return result.status === 204 ? null : result.json();
}

function publicStation(station, stationId) {
  const products = Object.entries(station?.combustiveis || {})
    .filter(([, product]) => product && product.ativo !== false)
    .map(([id, product]) => ({
      id,
      nome: String(product.nome || id),
      preco: Number(product.preco || 0) || 0,
      atualizadoEm: String(product.atualizadoEm || ""),
      atualizadoEmTimestamp: Number(product.atualizadoEmTimestamp || 0),
      origemAtualizacao: String(product.origemAtualizacao || ""),
      promocao: normalizePromotion(product.promocao)
    }));
  return {
    id: stationId,
    nome: String(station?.nomeExibicao || station?.razaoSocial || "Posto"),
    imagem: String(station?.imagem || ""),
    endereco: String(station?.endereco || ""),
    bairro: String(station?.bairro || ""),
    combustiveis: products
  };
}

function normalizePromotion(promotion) {
  if (!promotion || promotion.ativo !== true) return null;
  const price = Number(promotion.preco || 0);
  const start = Number(promotion.inicioEmTimestamp || 0);
  const end = Number(promotion.fimEmTimestamp || 0);
  const days = [...new Set((Array.isArray(promotion.diasSemana) ? promotion.diasSemana : []).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  const discountType = ["percentual", "valor"].includes(promotion.descontoTipo) ? promotion.descontoTipo : "";
  const discountValue = Number(promotion.descontoValor || 0);
  const hasPeriod = start > 0 && end > start;
  const hasNoPeriod = start === 0 && end === 0;
  const validDiscount = !discountType || (Number.isFinite(discountValue) && discountValue > 0 && (discountType !== "percentual" || discountValue <= 100));
  return Number.isFinite(price) && price > 0 && price <= 99.999 && days.length > 0 && (hasNoPeriod || hasPeriod) && validDiscount
    ? {
      ativo: true, preco: Math.round(price * 1000) / 1000, inicioEmTimestamp: hasPeriod ? start : 0, fimEmTimestamp: hasPeriod ? end : 0,
      descricao: String(promotion.descricao || "").trim().replace(/\s+/g, " ").slice(0, 240),
      diasSemana: days,
      descontoTipo: discountType,
      descontoValor: discountType ? Math.round(discountValue * 1000) / 1000 : 0
    }
    : null;
}

export default async function handler(request) {
  if (request.method !== "POST") return response({ success: false, message: "Metodo nao permitido." }, 405);

  const databaseUrl = (env("FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL).replace(/\/$/, "");
  const databaseAuth = env("FIREBASE_DATABASE_AUTH");
  if (!databaseAuth) return response({ success: false, message: "Servico de atualizacao ainda nao configurado." }, 503);

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action === "update" ? "update" : "load";
    const stationId = safeId(body.posto);
    const email = String(body.email || "").trim().toLowerCase();
    const secret = String(body.chave || body.token || "").trim();
    if (!stationId || secret.length < 20 || secret.length > 160) return response({ success: false, message: "Link invalido ou expirado." }, 404);

    const [linkAccess, station] = await Promise.all([
      firebaseJson(databaseUrl, databaseAuth, `combustiveisLinks/${stationId}`),
      firebaseJson(databaseUrl, databaseAuth, `configuracoes/combustiveis/postos/${stationId}`)
    ]);
    const savedSecret = String(linkAccess?.password || linkAccess?.token || "");
    const savedEmail = String(linkAccess?.email || "").trim().toLowerCase();
    const emailMatches = !savedEmail || constantTimeEqual(savedEmail, email);
    if (!linkAccess?.ativo || !station || !emailMatches || !constantTimeEqual(savedSecret, secret)) {
      return response({ success: false, message: "Link invalido ou expirado." }, 404);
    }

    const safeStation = publicStation(station, stationId);
    if (action === "load") return response({ success: true, posto: safeStation });

    const submitted = body.precos && typeof body.precos === "object" ? body.precos : {};
    const submittedPromotions = body.promocoes && typeof body.promocoes === "object" ? body.promocoes : {};
    const responsible = String(body.responsavelNome || "").trim().replace(/\s+/g, " ");
    if (responsible.length < 3 || responsible.length > 80) {
      return response({ success: false, message: "Informe o nome de quem esta realizando a atualizacao." }, 400);
    }
    const now = Date.now();
    const date = saoPauloDate(now);
    const prices = {};
    safeStation.combustiveis.forEach((product) => {
      const value = Number(String(submitted[product.id] ?? "").replace(",", "."));
      if (Number.isFinite(value) && value > 0 && value <= 99.999) prices[product.id] = Math.round(value * 1000) / 1000;
    });
    if (!Object.keys(prices).length || Object.keys(prices).length !== safeStation.combustiveis.length) {
      return response({ success: false, message: "Informe um valor valido para todos os combustiveis." }, 400);
    }

    const promotions = {};
    for (const product of safeStation.combustiveis) {
      const promotion = normalizePromotion(submittedPromotions[product.id]);
      if (submittedPromotions[product.id] && (!promotion || promotion.preco >= prices[product.id] || (promotion.descontoTipo === "valor" && promotion.descontoValor >= prices[product.id]))) {
        return response({ success: false, message: `Confira a promocao de ${product.nome}.` }, 400);
      }
      promotions[product.id] = promotion;
    }

    const historyId = `${now}-${Math.random().toString(36).slice(2, 9)}`;
    const updates = {};
    Object.entries(prices).forEach(([productId, price]) => {
      const base = `configuracoes/combustiveis/postos/${stationId}/combustiveis/${productId}`;
      updates[`${base}/preco`] = price;
      updates[`${base}/atualizadoEm`] = date;
      updates[`${base}/atualizadoEmTimestamp`] = now;
      updates[`${base}/origemAtualizacao`] = "link";
      updates[`${base}/promocao`] = promotions[productId]
        ? { ...promotions[productId], responsavelNome: responsible, atualizadoEmTimestamp: now }
        : null;
    });
    updates[`combustiveisHistorico/${stationId}/${historyId}`] = {
      postoId: stationId,
      postoNome: safeStation.nome,
      origem: "link",
      viaLink: true,
      responsavelNome: responsible,
      uid: String(linkAccess.uid || ""),
      email: savedEmail,
      atualizadoEm: date,
      atualizadoEmTimestamp: now,
      precos: prices,
      promocoes: promotions
    };
    await firebaseJson(databaseUrl, databaseAuth, "", { method: "PATCH", body: JSON.stringify(updates) });

    safeStation.combustiveis = safeStation.combustiveis.map((product) => ({
      ...product,
      preco: prices[product.id],
      atualizadoEm: date,
      atualizadoEmTimestamp: now,
      origemAtualizacao: "link",
      promocao: promotions[product.id]
        ? { ...promotions[product.id], responsavelNome: responsible, atualizadoEmTimestamp: now }
        : null
    }));
    return response({ success: true, message: "Precos atualizados com sucesso.", posto: safeStation, atualizadoEm: date, atualizadoEmTimestamp: now });
  } catch (error) {
    console.error("Falha ao atualizar combustiveis por link.", error);
    return response({ success: false, message: "Nao foi possivel atualizar agora. Tente novamente." }, 500);
  }
}
