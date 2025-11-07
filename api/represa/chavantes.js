export const config = { runtime: 'edge' };

/* -------- utils -------- */
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
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function toFloatBR(s) {
  if (!s) return null;
  const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

/* -------- encontra o painel (collapse) da UHE solicitada --------
   Procura pelo <button ... data-bs-target="#ID">UHE Chavantes</button>
   e depois abre o <div id="ID" class="accordion-collapse"> ... </div>
------------------------------------------------------------------ */
function getPlantPanel(html, plant = 'Chavantes') {
  const want = norm(`uhe ${plant}`);

  // 1) acha o button do acordeão
  // pega id do data-bs-target (ex: flush-c2) e o texto do botão
  const btnRe = /<button[^>]*data-bs-target="#([^"]+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = btnRe.exec(html))) {
    const collapseId = m[1];
    const btnText = m[2].replace(/<[^>]+>/g, ' ');
    if (norm(btnText).includes(want)) {
      // 2) abre o conteúdo do collapse com o id encontrado
      const escId = collapseId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const panelRe = new RegExp(
        `<div[^>]*id="${escId}"[^>]*class="[^"]*accordion-collapse[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`,
        'i'
      );
      const p = panelRe.exec(html);
      if (p) return p[1];
    }
  }
  return null;
}

/* -------- extrai métricas dentro do painel --------
   O HTML é tipo:
   <div> Nível </div>            ... <div>365,89</div>
   <div> Vazão Afluente </div>   ... <div>353,30</div>
   <div> Vazão Defluente </div>  ... <div>254,70</div>
------------------------------------------------------------------ */
function parsePanel(panelHtml) {
  // procura o número até ~200 chars depois do rótulo
  const rxNivel = /N[ií]vel[\s\S]{0,200}?>([\d.,]+)<\/div>/i;
  const rxAflu  = /Vaz[aã]o\s*Aflu[aê]nte[\s\S]{0,200}?>([\d.,]+)<\/div>/i;
  const rxDefl  = /Vaz[aã]o\s*Deflu[aê]nte[\s\S]{0,200}?>([\d.,]+)<\/div>/i;

  const n = panelHtml.match(rxNivel);
  const a = panelHtml.match(rxAflu);
  const d = panelHtml.match(rxDefl);

  const cota = toFloatBR(n?.[1]);
  const vazaoAfluente = toFloatBR(a?.[1]);
  const vazaoDefluente = toFloatBR(d?.[1]);

  if (cota == null && vazaoAfluente == null && vazaoDefluente == null) return null;
  return { cota, vazaoAfluente, vazaoDefluente };
}

/* ---------------- handler ---------------- */
export default async function handler(req) {
  const url = new URL(req.url);
  const plant = (url.searchParams.get('plant') || 'Chavantes').toString();
  const debug = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === '2';

  const tried = [];
  try {
    const sources = [
      'https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
      'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
      'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
    ];

    let html;
    for (const u of sources) {
      try {
        html = await fetchText(u);
        tried.push({ url: u, ok: true });
        break;
      } catch (e) {
        tried.push({ url: u, ok: false, why: String(e) });
      }
    }
    if (!html) {
      return res(false, { error: 'Falha ao baixar HTML da CTG.', fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
    }

    const panel = getPlantPanel(html, plant);
    if (!panel) {
      return res(false, { error: `Não localizei o painel da UHE '${plant}'.`, fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
    }

    const data = parsePanel(panel);
    if (!data) {
      return res(false, {
        error: 'Não foi possível extrair Nível/Vazões deste painel.',
        fonte: 'CTG Brasil',
        _debug: debug ? { tried, sample: url.searchParams.get('debug') === '2' ? panel.slice(0, 1500) : undefined } : undefined
      });
    }

    return res(true, {
      success: true,
      fonte: 'CTG Brasil',
      cotaAtual: data.cota != null ? data.cota.toFixed(2) : null,
      volumeUtil: null, // % não aparece estável na página
      vazaoAfluente: data.vazaoAfluente != null ? data.vazaoAfluente.toFixed(2) : null,
      vazaoDefluente: data.vazaoDefluente != null ? data.vazaoDefluente.toFixed(2) : null,
      atualizadoEm: new Date().toISOString(),
      ...(debug ? { _debug: { tried } } : {})
    });

  } catch (err) {
    return res(false, { error: String(err), fonte: 'CTG Brasil', _debug: debug ? { tried } : undefined });
  }
}

function res(ok, body) {
  const payload = ok ? body : { success: false, ...body };
  if (ok && payload.success === undefined) payload.success = true;
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    }
  });
}
