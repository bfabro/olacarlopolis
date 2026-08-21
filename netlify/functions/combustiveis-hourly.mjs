/* Sincronizacao configuravel e diagnosticavel de combustiveis - v4 */
const MENOR_PRECO_API = "https://menorpreco.notaparana.pr.gov.br/api/v1";
const DEFAULT_DATABASE_URL = "https://contadoracessos-default-rtdb.firebaseio.com";
const DEFAULT_RADIUS_KM = 10;
const FUEL_TYPES = [1, 2, 3, 4, 5];
const AUTO_INTERVAL_MINUTES = [15, 30, 60];
const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || globalThis.process?.env?.[name] || "";
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usefulWords(value) {
  const ignored = new Set(["auto", "posto", "comercio", "combustiveis", "combustivel", "ltda", "rua", "avenida", "av", "de", "do", "da", "e", "ipiranga"]);
  return new Set(normalizeText(value).split(" ").filter((word) => word.length > 2 && !ignored.has(word)));
}

function wordOverlap(left, right) {
  const a = usefulWords(left);
  const b = usefulWords(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((word) => { if (b.has(word)) common += 1; });
  return common / Math.min(a.size, b.size);
}

function addressNumber(value) {
  const matches = normalizeText(value).match(/\b\d+\b/g);
  return matches?.at(-1) || "";
}

export function encodeGeohash(latitude, longitude, precision = 12) {
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let even = true;
  let bit = 0;
  let character = 0;
  let result = "";
  while (result.length < precision) {
    const range = even ? lonRange : latRange;
    const coordinate = even ? longitude : latitude;
    const middle = (range[0] + range[1]) / 2;
    if (coordinate >= middle) {
      character |= 1 << (4 - bit);
      range[0] = middle;
    } else {
      range[1] = middle;
    }
    even = !even;
    if (bit < 4) bit += 1;
    else {
      result += GEOHASH_ALPHABET[character];
      bit = 0;
      character = 0;
    }
  }
  return result;
}

export function fuelKind(value) {
  const text = normalizeText(value).replace(/\s/g, "");
  if (text.includes("arla32")) return "";
  if (text.includes("gasolina") && (text.includes("aditiv") || text.includes("ipimax"))) return "gasolina-aditivada";
  if (text.includes("gasolina")) return "gasolina-comum";
  if (text.includes("etanol") || text.includes("alcool")) return "etanol";
  if (text.includes("diesel") && text.includes("s10")) return "diesel-s10";
  if (text.includes("diesel")) return "diesel-s500";
  if (text.includes("gnv") || text.includes("gasnaturalveicular")) return "gnv";
  return "";
}

function apiStation(record = {}) {
  return record.estabelecimento && typeof record.estabelecimento === "object" ? record.estabelecimento : {};
}

function apiStationAddress(record = {}) {
  const establishment = apiStation(record);
  return [establishment.tp_logr, establishment.nm_logr, establishment.nr_logr].filter(Boolean).join(" ");
}

function stationMatchScore(station = {}, record = {}) {
  const establishment = apiStation(record);
  const configuredCode = String(station.menorPrecoCodigo || "").trim();
  if (configuredCode) return configuredCode === String(establishment.codigo || "") ? 10000 : -1;

  const configuredNames = `${station.nomeExibicao || ""} ${station.razaoSocial || ""}`;
  const apiNames = `${establishment.nm_fan || ""} ${establishment.nm_emp || ""}`;
  const configuredAddress = station.endereco || "";
  const returnedAddress = apiStationAddress(record);
  let score = 0;
  const normalizedConfiguredNames = normalizeText(configuredNames).replace(/\s/g, "");
  const normalizedApiNames = normalizeText(apiNames).replace(/\s/g, "");
  if (normalizedConfiguredNames && normalizedApiNames && (normalizedConfiguredNames.includes(normalizedApiNames) || normalizedApiNames.includes(normalizedConfiguredNames))) score += 50;
  score += wordOverlap(configuredNames, apiNames) * 60;
  score += wordOverlap(configuredAddress, returnedAddress) * 35;
  const configuredNumber = addressNumber(configuredAddress);
  const returnedNumber = addressNumber(returnedAddress);
  if (configuredNumber && returnedNumber && configuredNumber === returnedNumber) score += 45;
  if (normalizeText(station.municipio) && normalizeText(station.municipio) === normalizeText(establishment.mun)) score += 10;
  return score;
}

export function matchStation(station = {}, records = []) {
  const representatives = new Map();
  records.forEach((record) => {
    const code = String(apiStation(record).codigo || "");
    if (code && !representatives.has(code)) representatives.set(code, record);
  });
  const ranked = [...representatives.values()]
    .map((record) => ({ record, score: stationMatchScore(station, record) }))
    .filter((entry) => entry.score >= 60)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  if (!station.menorPrecoCodigo && ranked[1] && ranked[0].score - ranked[1].score < 15) return null;
  return ranked[0].record;
}

function saoPauloDate(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(timestamp))
    .reduce((result, part) => { if (part.type !== "literal") result[part.type] = part.value; return result; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function firebaseUrl(databaseUrl, databaseAuth, path = "") {
  const auth = databaseAuth ? `?auth=${encodeURIComponent(databaseAuth)}` : "";
  return `${databaseUrl}/${path}.json${auth}`;
}

async function firebaseJson(databaseUrl, databaseAuth, path, options = {}) {
  const response = await fetch(firebaseUrl(databaseUrl, databaseAuth, path), {
    ...options,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Firebase respondeu HTTP ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

async function menorPrecoJson(path, parameters) {
  const url = new URL(`${MENOR_PRECO_API}/${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(12000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(`Menor Preco respondeu HTTP ${response.status}.`);
  return payload;
}

function configuredCenter(stations) {
  const coordinates = stations.map((station) => ({ latitude: Number(station.latitude), longitude: Number(station.longitude) }))
    .filter(({ latitude, longitude }) => (
      Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude !== 0
      && longitude !== 0
      && latitude >= -35 && latitude <= 6
      && longitude >= -75 && longitude <= -30
    ));
  if (!coordinates.length) return { latitude: -23.4269, longitude: -49.7218 };
  return {
    latitude: coordinates.reduce((sum, item) => sum + item.latitude, 0) / coordinates.length,
    longitude: coordinates.reduce((sum, item) => sum + item.longitude, 0) / coordinates.length
  };
}

function latestRecordsForStation(records, stationCode) {
  const latest = new Map();
  records.filter((record) => String(apiStation(record).codigo || "") === stationCode).forEach((record) => {
    const kind = fuelKind(record.desc);
    const timestamp = Date.parse(record.datahora || "");
    if (!kind || !Number.isFinite(timestamp)) return;
    const current = latest.get(kind);
    if (!current || timestamp > Date.parse(current.datahora || "")) latest.set(kind, record);
  });
  return latest;
}

export default async function handler() {
  const databaseUrl = (env("FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL).replace(/\/$/, "");
  const databaseAuth = env("FIREBASE_DATABASE_AUTH");
  if (!databaseAuth) throw new Error("FIREBASE_DATABASE_AUTH nao configurado.");

  const config = await firebaseJson(databaseUrl, databaseAuth, "configuracoes/combustiveis");
  if (!config || config.menorPrecoAutomatico === false) {
    console.log("Sincronizacao do Menor Preco desativada.");
    return new Response(null, { status: 204 });
  }
  const intervalMinutes = AUTO_INTERVAL_MINUTES.includes(Number(config.menorPrecoIntervaloMinutos)) ? Number(config.menorPrecoIntervaloMinutos) : 60;
  const now = Date.now();
  const lastConsultation = Number(config.menorPrecoUltimaConsultaEm || 0);
  const elapsed = now - lastConsultation;
  if (lastConsultation > 0 && elapsed >= 0 && elapsed + 30000 < intervalMinutes * 60000) {
    console.log(`Menor Preco aguardando intervalo de ${intervalMinutes} minuto(s).`);
    return new Response(null, { status: 204 });
  }
  const stationEntries = Object.entries(config.postos || {}).filter(([, station]) => station && station.ativo !== false);
  if (!stationEntries.length) return new Response(null, { status: 204 });

  try {
    await firebaseJson(databaseUrl, databaseAuth, "", {
      method: "PATCH",
      body: JSON.stringify({
        "configuracoes/combustiveis/menorPrecoUltimaConsultaStatus": "consultando",
        "configuracoes/combustiveis/menorPrecoUltimaTentativaEm": now,
        "configuracoes/combustiveis/menorPrecoIntervaloExecutadoMinutos": intervalMinutes
      })
    });

    const center = configuredCenter(stationEntries.map(([, station]) => station));
    const local = encodeGeohash(center.latitude, center.longitude);
    const radius = Math.min(Math.max(Number(config.menorPrecoRaioKm || DEFAULT_RADIUS_KM), 1), 30);
    const baseParameters = { local, raio: radius };
    const apiResults = await Promise.allSettled([
      menorPrecoJson("categorias", { ...baseParameters, termo: "gasolina" }),
      ...FUEL_TYPES.map((type) => menorPrecoJson("produtos", { ...baseParameters, data: 6, tp_comb: type, offset: 0 }))
    ]);
    const categoriesPayload = apiResults[0].status === "fulfilled" ? apiResults[0].value : null;
    const successfulProductPayloads = apiResults.slice(1).filter((result) => result.status === "fulfilled").map((result) => result.value);
    const failedRequests = apiResults.filter((result) => result.status === "rejected");
    if (!successfulProductPayloads.length) {
      const reason = failedRequests.map((result) => result.reason?.message || "falha desconhecida").join("; ");
      throw new Error(`Nenhuma consulta de produtos foi concluida. ${reason}`);
    }
    const records = successfulProductPayloads.flatMap((payload) => Array.isArray(payload.produtos) ? payload.produtos : []);
    const updates = {
      "configuracoes/combustiveis/menorPrecoUltimaConsultaEm": now,
      "configuracoes/combustiveis/menorPrecoUltimaConsultaStatus": failedRequests.length ? "parcial" : "ok",
      "configuracoes/combustiveis/menorPrecoUltimoErro": failedRequests.length ? failedRequests.map((result) => result.reason?.message || "Falha na API").join("; ").slice(0, 300) : null,
      "configuracoes/combustiveis/menorPrecoRequisicoesComFalha": failedRequests.length,
      "configuracoes/combustiveis/menorPrecoLocal": local,
      "configuracoes/combustiveis/menorPrecoCategoria": (categoriesPayload?.categorias || []).find((category) => normalizeText(category.desc).includes("combustiveis"))?.id || null
    };
    let matchedStations = 0;
    let updatedProducts = 0;

    stationEntries.forEach(([stationId, station]) => {
      const matched = matchStation(station, records);
      if (!matched) return;
      const stationCode = String(apiStation(matched).codigo || "");
      if (!stationCode) return;
      matchedStations += 1;
      const stationBase = `configuracoes/combustiveis/postos/${stationId}`;
      updates[`${stationBase}/menorPrecoCodigo`] = stationCode;
      updates[`${stationBase}/menorPrecoNome`] = apiStation(matched).nm_fan || apiStation(matched).nm_emp || "";
      updates[`${stationBase}/menorPrecoVerificadoEm`] = now;
      const latest = latestRecordsForStation(records, stationCode);
      const changes = {};
      const prices = {};

      Object.entries(station.combustiveis || {}).forEach(([productId, product]) => {
        if (!product || product.ativo === false) return;
        const kind = fuelKind(`${productId} ${product.nome || ""} ${product.nomeAnp || ""}`);
        const record = latest.get(kind);
        if (!kind || !record) return;
        const sourceTimestamp = Date.parse(record.datahora || "");
        const currentTimestamp = Number(product.atualizadoEmTimestamp || 0);
        const price = Math.round(Number(record.valor || 0) * 1000) / 1000;
        if (!Number.isFinite(sourceTimestamp) || sourceTimestamp <= currentTimestamp || sourceTimestamp > now + 300000 || !(price > 0 && price <= 99.999)) return;
        const productBase = `${stationBase}/combustiveis/${productId}`;
        updates[`${productBase}/preco`] = price;
        updates[`${productBase}/atualizadoEm`] = saoPauloDate(sourceTimestamp);
        updates[`${productBase}/atualizadoEmTimestamp`] = sourceTimestamp;
        updates[`${productBase}/verificadoEmTimestamp`] = now;
        updates[`${productBase}/origemAtualizacao`] = "nota-parana";
        updates[`${productBase}/fonteAtualizacao`] = "Menor Preco / Nota Parana";
        updates[`${productBase}/menorPrecoProdutoId`] = String(record.id || "");
        updates[`${productBase}/menorPrecoDescricao`] = String(record.desc || "");
        prices[productId] = price;
        if (Number(product.preco || 0) !== price) {
          changes[productId] = { nome: product.nome || productId, precoAnterior: Number(product.preco || 0), precoNovo: price, fonteDescricao: String(record.desc || ""), fonteDatahora: String(record.datahora || "") };
        }
        updatedProducts += 1;
      });

      if (Object.keys(changes).length) {
        const historyId = `${now}-${stationId}-nota-parana`;
        updates[`combustiveisHistorico/${stationId}/${historyId}`] = {
          postoId: stationId,
          postoNome: station.nomeExibicao || station.razaoSocial || "Posto",
          origem: "nota-parana",
          viaLink: false,
          responsavelNome: "Menor Preco / Nota Parana",
          atualizadoEm: saoPauloDate(now),
          atualizadoEmTimestamp: now,
          precos: prices,
          alteracoes: changes
        };
      }
    });

    updates["configuracoes/combustiveis/menorPrecoPostosEncontrados"] = matchedStations;
    updates["configuracoes/combustiveis/menorPrecoProdutosAtualizados"] = updatedProducts;
    await firebaseJson(databaseUrl, databaseAuth, "", { method: "PATCH", body: JSON.stringify(updates) });
    console.log(`Menor Preco consultado: ${matchedStations} posto(s), ${updatedProducts} produto(s) atualizado(s), ${failedRequests.length} falha(s) parcial(is).`);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = String(error?.message || error || "Falha desconhecida").slice(0, 300);
    console.error("Falha na sincronizacao do Menor Preco:", error);
    try {
      await firebaseJson(databaseUrl, databaseAuth, "", {
        method: "PATCH",
        body: JSON.stringify({
          "configuracoes/combustiveis/menorPrecoUltimaConsultaStatus": "erro",
          "configuracoes/combustiveis/menorPrecoUltimoErro": message,
          "configuracoes/combustiveis/menorPrecoUltimaFalhaEm": Date.now()
        })
      });
    } catch (statusError) {
      console.error("Falha ao registrar o erro da sincronizacao:", statusError);
    }
    throw error;
  }
}

export const config = {
  schedule: "*/15 * * * *"
};
