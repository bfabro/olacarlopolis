export const config = { runtime: 'edge' };

/** Fetch com UA de navegador (evita bloqueios) */
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

/** Normaliza texto: minúsculas + remove acentos + comprime espaços */
function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converte número PT-BR -> float (aceita 1.234,56 / 1234,56 / 1234.56) */
function toFloatBR(s) {
  if (!s) return null;
  let t = (s + '').trim();
  // remove separador de milhar . (se houver) e troca , por .
  t = t.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

/** Extrai o bloco HTML de uma UHE específica do HTML geral */
function extractPlantBlock(html, plantName) {
  const normHtml = normalize(html);
  const key = normalize(plantName); // ex.: "uhe chavantes" ou "chavantes"

  // tenta encontrar "uhe <nome>" primeiro
  let idx = normHtml.indexOf(`uhe ${key}`);
  if (idx === -1) {
    // tenta só pelo nome
    idx = normHtml.indexOf(key);
  }
  if (idx === -1) return null;

  // janela generosa ao redor do cabeçalho da UHE
  const start = Math.max(0, idx - 1500);
  const end = Math.min(html.length, idx + 8000);
  const windowHtml = html.slice(start, end);

  // tenta cortar o bloco do accordion-item da UHE até o próximo accordion-item
  const startMatch = windowHtml.match(/<div[^>]*class=["'][^"']*accordion-item[^"']*["'][^>]*>/i);
  if (!startMatch) return windowHtml; // devolve janela se não achar o contêiner
  const startPos = startMatch.index ?? 0;
  const rest = windowHtml.slice(startPos);
  const nextItem = rest.search(/<div[^>]*class=["'][^"']*accordion-item[^"']*["'][^>]*>/i);
  // se aparecer outro accordion-item, corta antes dele; senão devolve o restante
  return nextItem > 0 ? rest.slice(0, nextItem) : rest;
}

/** Faz o parse do bloco da UHE: Nível (m), Vazão Afluente e Vazão Defluente (m³/s) */
function parseMetricsFromBlock(blockHtml) {
  // Regex tolerantes aos acentos
  const rxNivel = /N[ií]vel[\s\S]{0,80}?(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/i;
  const rxAflu = /Vaz[aã]o\s*Afluente[\s\S]{0,80}?(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/i;
  const rxDefl = /Vaz[aã]o\s*Defluente[\s\S]{0,80}?(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/i;

  const mNivel = blockHtml.match(rxNivel);
  const mAflu  = blockHtml.match(rxAflu);
  const mDefl  = blockHtml.match(rxDefl);

  const cota = toFloatBR(mNivel?.[1]);
  const vazaoAfluente = toFloatBR(mAflu?.[1]);
  const vazaoDefluente = toFloatBR(mDefl?.[1]);

  if (cota == null && vazaoAfluente == null && vazaoDefluente == null) {
    return null;
  }
  return { cota, vazaoAfluente, vazaoDefluente };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === '2';
  // permite forçar outra usina p/ teste: ?plant=capivara
  const plant = (url.searchParams.get('plant') || 'Chavantes').toString();

  const tried = [];
  try {
    // 1) direto
    let html;
    const u1 = 'https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    try {
      html = await fetchText(u1);
      tried.push({ url: u1, ok: true });
    } catch (e1) {
      tried.push({ url: u1, ok: false, why: String(e1) });
    }

    // 2) proxy https→https
    if (!html) {
      const u2 = 'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
      try {
        html = await fetchText(u2);
        tried.push({ url: u2, ok: true });
      } catch (e2) {
        tried.push({ url: u2, ok: false, why: String(e2) });
      }
    }

    // 3) variação sem www
    if (!html) {
      const u3 = 'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
      try {
        html = await fetchText(u3);
        tried.push({ url: u3, ok: true });
      } catch (e3) {
        tried.push({ url: u3, ok: false, why: String(e3) });
      }
    }

    if (!html) {
      return respond(false, { error: 'Não foi possível baixar a página da CTG.', fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
    }

    const block = extractPlantBlock(html, plant);
    if (!block) {
      return respond(false, { error: `Não foi possível localizar a UHE '${plant}'.`, fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
    }

    const metrics = parseMetricsFromBlock(block);
    if (!metrics) {
      return respond(false, {
        error: 'Não foi possível extrair Nível/Vazões do bloco da UHE.',
        fonte: 'CTG Brasil',
        _debug: debug ? { tried, sample: url.searchParams.get('debug') === '2' ? block.slice(0, 2000) : undefined } : undefined
      });
    }

    const body = {
      success: true,
      fonte: 'CTG Brasil',
      cotaAtual: metrics.cota != null ? metrics.cota.toFixed(2) : null,
      volumeUtil: null, // página atual não expõe % de volume de forma estável
      vazaoAfluente: metrics.vazaoAfluente != null ? metrics.vazaoAfluente.toFixed(2) : null,
      vazaoDefluente: metrics.vazaoDefluente != null ? metrics.vazaoDefluente.toFixed(2) : null,
      atualizadoEm: new Date().toISOString(),
      ...(debug ? { _debug: { tried } } : {})
    };
    return respond(true, body);
  } catch (err) {
    return respond(false, { error: String(err), fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
  }
}

function respond(ok, body) {
  const payload = ok
    ? body
    : { success: false, ...body };
  if (ok && payload.success === undefined) payload.success = true;

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    }
  });
}
