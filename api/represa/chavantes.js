export const config = { runtime: 'edge' };

// ====== funções utilitárias ======
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFloatBR(s) {
  if (!s) return null;
  const v = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

// ====== parsing principal ======
function splitUHEBlocks(html) {
  const blocks = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  const idxs = [];
  while ((m = h2Re.exec(html))) {
    idxs.push({ start: m.index, end: h2Re.lastIndex, titleRaw: m[1] });
  }
  for (let i = 0; i < idxs.length; i++) {
    const head = idxs[i];
    const next = idxs[i + 1]?.start ?? html.length;
    blocks.push({
      titleRaw: head.titleRaw,
      blockHtml: html.slice(head.end, next),
    });
  }
  return blocks;
}

function findChavantesBlock(html, plant = 'Chavantes') {
  const blocks = splitUHEBlocks(html);
  const target = normalize(`uhe ${plant}`);
  for (const b of blocks) {
    const titleNorm = normalize(b.titleRaw);
    if (titleNorm.includes(target)) return b.blockHtml;
  }
  const alt = normalize(plant);
  for (const b of blocks) {
    if (normalize(b.titleRaw).includes(alt)) return b.blockHtml;
  }
  return null;
}

// ====== novo parser flexível ======
function parseMetrics(blockHtml) {
  // cada linha do tipo: <div>Nível</div> ... <div>365,89</div>
  const regexNivel = /nivel[\s\S]{0,80}?<div[^>]*>\s*([\d.,]+)\s*<\/div>/i;
  const regexAflu = /vaza[oã]\s*aflu[aê]nte[\s\S]{0,80}?<div[^>]*>\s*([\d.,]+)\s*<\/div>/i;
  const regexDefl = /vaza[oã]\s*deflu[aê]nte[\s\S]{0,80}?<div[^>]*>\s*([\d.,]+)\s*<\/div>/i;

  const n = blockHtml.match(regexNivel);
  const a = blockHtml.match(regexAflu);
  const d = blockHtml.match(regexDefl);

  const cota = toFloatBR(n?.[1]);
  const vazaoAfluente = toFloatBR(a?.[1]);
  const vazaoDefluente = toFloatBR(d?.[1]);

  if (cota == null && vazaoAfluente == null && vazaoDefluente == null)
    return null;

  return { cota, vazaoAfluente, vazaoDefluente };
}

// ====== handler principal ======
export default async function handler(req) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === '2';
  const plant = url.searchParams.get('plant') || 'Chavantes';
  const tried = [];

  try {
    const urls = [
      'https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
      'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
      'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
    ];

    let html;
    for (const u of urls) {
      try {
        html = await fetchText(u);
        tried.push({ url: u, ok: true });
        break;
      } catch (err) {
        tried.push({ url: u, ok: false, why: String(err) });
      }
    }

    if (!html) {
      return respond(false, {
        error: 'Falha ao baixar HTML da CTG.',
        fonte: 'CTG Brasil',
        _debug: debug ? { tried } : undefined,
      });
    }

    const block = findChavantesBlock(html, plant);
    if (!block) {
      return respond(false, {
        error: `Não foi possível localizar a UHE '${plant}'.`,
        fonte: 'CTG Brasil',
        _debug: debug ? { tried } : undefined,
      });
    }

    const data = parseMetrics(block);
    if (!data) {
      return respond(false, {
        error: 'Não foi possível extrair Nível/Vazões do bloco.',
        fonte: 'CTG Brasil',
        _debug: debug ? { tried, sample: debug ? block.slice(0, 1000) : undefined } : undefined,
      });
    }

    const now = new Date();
    const body = {
      success: true,
      fonte: 'CTG Brasil',
      cotaAtual: data.cota?.toFixed(2) ?? null,
      volumeUtil: null,
      vazaoAfluente: data.vazaoAfluente?.toFixed(2) ?? null,
      vazaoDefluente: data.vazaoDefluente?.toFixed(2) ?? null,
      atualizadoEm: now.toISOString(),
      ...(debug ? { _debug: { tried } } : {}),
    };
    return respond(true, body);
  } catch (err) {
    return respond(false, {
      error: String(err),
      fonte: 'CTG Brasil',
      _debug: debug ? { tried } : undefined,
    });
  }
}

function respond(ok, body) {
  const payload = ok ? body : { success: false, ...body };
  if (ok && payload.success === undefined) payload.success = true;
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}
