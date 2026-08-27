// Consulta resiliente dos resultados das Loterias CAIXA - v2
const CAIXA_HOME = "https://servicebus2.caixa.gov.br/portaldeloterias/api/home/ultimos-resultados";
const CAIXA_MODALIDADE_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
const FALLBACK_BASE = "https://loteriascaixa-api.herokuapp.com/api";
const CACHE_TTL_MS = 60 * 1000;
const MODALIDADES = ["megasena", "lotofacil", "quina", "lotomania", "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria", "federal"];
const CHAVES_CAIXA = { megasena: "megasena", lotofacil: "lotofacil", quina: "quina", lotomania: "lotomania", timemania: "timemania", duplasena: "duplasena", diadesorte: "diaDeSorte", supersete: "superSete", maismilionaria: "maisMilionaria", federal: "federal" };
const cache = new Map();
const REQUEST_HEADERS = {
  accept: "application/json, text/plain, */*",
  "accept-language": "pt-BR,pt;q=0.9",
  referer: "https://loterias.caixa.gov.br/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0 Safari/537.36"
};

async function buscarJson(url) {
  const response = await fetch(url, { cache: "no-store", headers: REQUEST_HEADERS, signal: AbortSignal.timeout(10000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== "object") throw new Error(`HTTP ${response.status}`);
  return data;
}

function normalizarCaixa(data) {
  if (!data || typeof data !== "object") return null;
  const premiosFederal = Array.isArray(data.premios) ? data.premios.map((premio, index) => ({
    descricaoFaixa: String(premio.posicao || index + 1) + "\u00ba premio",
    faixa: premio.posicao || index + 1,
    numeroDeGanhadores: 1,
    valorPremio: premio.valorPremio || 0
  })) : [];
  return {
    ...data,
    numero: data.numero ?? data.numeroDoConcurso,
    listaDezenas: data.listaDezenas ?? data.dezenas ?? [],
    listaDezenasSegundoSorteio: data.listaDezenasSegundoSorteio ?? data.dezenasSegundoSorteio ?? [],
    listaRateioPremio: data.listaRateioPremio ?? premiosFederal,
    nomeTimeCoracaoMesSorte: data.nomeTimeCoracaoMesSorte ?? data.timeDoCoracao ?? data.mesDaSorte ?? ""
  };
}

function normalizarFallback(data, slug) {
  if (!data || typeof data !== "object") return null;
  return {
    ...data,
    numero: data.numero ?? data.concurso,
    dataApuracao: data.dataApuracao ?? data.data,
    localSorteio: data.localSorteio ?? data.local,
    acumulado: data.acumulado ?? data.acumulou ?? false,
    listaDezenas: slug === "duplasena" && Array.isArray(data.dezenas) && data.dezenas.length >= 12 ? data.dezenas.slice(0, 6) : data.listaDezenas ?? data.dezenas ?? [],
    listaDezenasSegundoSorteio: slug === "duplasena" && Array.isArray(data.dezenas) && data.dezenas.length >= 12 ? data.dezenas.slice(6, 12) : data.listaDezenasSegundoSorteio ?? data.dezenasSegundoSorteio ?? [],
    listaRateioPremio: data.listaRateioPremio ?? (Array.isArray(data.premiacoes) ? data.premiacoes.map((item) => ({ descricaoFaixa: item.descricao, faixa: item.faixa, numeroDeGanhadores: item.ganhadores, valorPremio: item.valorPremio })) : []),
    listaMunicipioUFGanhadores: data.listaMunicipioUFGanhadores ?? data.localGanhadores ?? [],
    nomeTimeCoracaoMesSorte: data.nomeTimeCoracaoMesSorte ?? data.timeCoracao ?? data.mesSorte ?? ""
  };
}

async function consultarCaixa() {
  try {
    const payload = await buscarJson(CAIXA_HOME);
    return new Map(MODALIDADES.map((slug) => [slug, normalizarCaixa(payload[CHAVES_CAIXA[slug]])]));
  } catch (error) {
    console.error("Loterias CAIXA consolidado indisponivel", error?.name, error?.message);
    return new Map();
  }
}

async function consultarFallback(slug) {
  try { return normalizarFallback(await buscarJson(`${FALLBACK_BASE}/${slug}/latest`), slug); }
  catch (error) { return null; }
}

function dataDisponivelHoje(value) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const dataConcurso = Number(`${match[3]}${match[2]}${match[1]}`);
  const partesHoje = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((parte) => [parte.type, parte.value]));
  const hoje = Number(`${partesHoje.year}${partesHoje.month}${partesHoje.day}`);
  return dataConcurso <= hoje;
}

async function consultarCaixaModalidade(slug, referencia) {
  const atual = concurso(referencia);
  const dataDoProximoChegou = dataDisponivelHoje(referencia?.dataProximoConcurso);
  const proximoInformado = Number(referencia?.numeroConcursoProximo) || 0;
  const proximo = proximoInformado || (atual && dataDoProximoChegou ? atual + 1 : 0);
  const consultarProximo = proximo > atual && dataDoProximoChegou;
  const caminho = consultarProximo ? `${slug}/${proximo}` : slug;
  try {
    const data = normalizarCaixa(await buscarJson(`${CAIXA_MODALIDADE_BASE}/${caminho}?t=${Date.now()}`));
    const temResultado = Array.isArray(data?.listaDezenas) && data.listaDezenas.length > 0;
    return temResultado ? data : null;
  } catch (error) {
    return null;
  }
}

function concurso(data) { return Number(data?.numero) || 0; }

export async function carregarResultados(force = false) {
  if (!force && MODALIDADES.every((slug) => {
    const item = cache.get(slug);
    return item?.data && Date.now() - item.atualizadoEm < CACHE_TTL_MS;
  })) {
    return MODALIDADES.map((slug) => ({ slug, ok: true, cache: true, origem: cache.get(slug).origem, data: cache.get(slug).data }));
  }

  const caixa = await consultarCaixa();
  const [caixaModalidades, fallbackLista] = await Promise.all([
    Promise.all(MODALIDADES.map((slug) => consultarCaixaModalidade(slug, caixa.get(slug)))),
    Promise.all(MODALIDADES.map((slug) => consultarFallback(slug)))
  ]);
  return MODALIDADES.map((slug, index) => {
    const candidatos = [
      { data: caixaModalidades[index], origem: "CAIXA/concurso" },
      { data: caixa.get(slug), origem: "CAIXA" },
      { data: fallbackLista[index], origem: "API comunitária/CAIXA" }
    ].filter((item) => item.data?.numero).sort((a, b) => concurso(b.data) - concurso(a.data));
    const escolhido = candidatos[0];
    if (escolhido) {
      cache.set(slug, { atualizadoEm: Date.now(), origem: escolhido.origem, data: escolhido.data });
      return { slug, ok: true, cache: false, origem: escolhido.origem, data: escolhido.data };
    }
    const salvo = cache.get(slug);
    if (salvo?.data) return { slug, ok: true, cache: true, stale: true, origem: salvo.origem, data: salvo.data };
    return { slug, ok: false, message: "Resultado temporariamente indisponivel." };
  });
}
