// Atualizacao segura de precos de combustiveis por link exclusivo - v1
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
      atualizadoEm: String(product.atualizadoEm || "")
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

export default async function handler(request) {
  if (request.method !== "POST") return response({ success: false, message: "Metodo nao permitido." }, 405);

  const databaseUrl = (env("FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL).replace(/\/$/, "");
  const databaseAuth = env("FIREBASE_DATABASE_AUTH");
  if (!databaseAuth) return response({ success: false, message: "Servico de atualizacao ainda nao configurado." }, 503);

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action === "update" ? "update" : "load";
    const stationId = safeId(body.posto);
    const token = String(body.token || "").trim();
    if (!stationId || token.length < 40 || token.length > 160) return response({ success: false, message: "Link invalido ou expirado." }, 404);

    const [linkAccess, station] = await Promise.all([
      firebaseJson(databaseUrl, databaseAuth, `combustiveisLinks/${stationId}`),
      firebaseJson(databaseUrl, databaseAuth, `configuracoes/combustiveis/postos/${stationId}`)
    ]);
    if (!linkAccess?.ativo || !station || !constantTimeEqual(linkAccess.token, token)) {
      return response({ success: false, message: "Link invalido ou expirado." }, 404);
    }

    const safeStation = publicStation(station, stationId);
    if (action === "load") return response({ success: true, posto: safeStation });

    const submitted = body.precos && typeof body.precos === "object" ? body.precos : {};
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

    const historyId = `${now}-${Math.random().toString(36).slice(2, 9)}`;
    const updates = {};
    Object.entries(prices).forEach(([productId, price]) => {
      const base = `configuracoes/combustiveis/postos/${stationId}/combustiveis/${productId}`;
      updates[`${base}/preco`] = price;
      updates[`${base}/atualizadoEm`] = date;
      updates[`${base}/atualizadoEmTimestamp`] = now;
      updates[`${base}/origemAtualizacao`] = "link";
    });
    updates[`combustiveisHistorico/${stationId}/${historyId}`] = {
      postoId: stationId,
      postoNome: safeStation.nome,
      origem: "link",
      atualizadoEm: date,
      atualizadoEmTimestamp: now,
      precos: prices
    };
    await firebaseJson(databaseUrl, databaseAuth, "", { method: "PATCH", body: JSON.stringify(updates) });

    safeStation.combustiveis = safeStation.combustiveis.map((product) => ({
      ...product,
      preco: prices[product.id],
      atualizadoEm: date
    }));
    return response({ success: true, message: "Precos atualizados com sucesso.", posto: safeStation, atualizadoEm: date });
  } catch (error) {
    console.error("Falha ao atualizar combustiveis por link.", error);
    return response({ success: false, message: "Nao foi possivel atualizar agora. Tente novamente." }, 500);
  }
}
