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

  // 1) acha o botão do acordeão e pega o data-bs-target="#ID"
  const btnRe = /<button[^>]*data-bs-target="#([^"]+)"[^>]*>([\s\S]*?)<\/button>/gi;
  let m;
  while ((m = btnRe.exec(html))) {
    const collapseId = m[1];
    const btnText = m[2].replace(/<[^>]+>/g, ' ');
    if (!norm(btnText).includes(want)) continue;

    // 2) em vez de regex fechando </div>, pegamos uma JANELA grande após o id
    const idx = html.indexOf(`id="${collapseId}"`);
    if (idx === -1) return null;

    // janela generosa (pega todo o conteúdo do painel)
    const start = Math.max(0, idx - 200);          // um pouco antes do <div id="...">
    const end   = Math.min(html.length, idx + 12000); // 12k chars normalmente cobre o painel inteiro
    return html.slice(start, end);
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
  // Localiza rótulo no TEXTO NORMALIZADO, mas coleta números no HTML bruto
  const raw = panelHtml;
  const normText = norm(panelHtml);

  function pickNumberAfter(labelNorm, maxLookahead = 1200) {
    const at = normText.indexOf(labelNorm);
    if (at === -1) return null;
    // Mapeia para a posição aproximada no HTML bruto (mesmo índice funciona bem nas páginas da CTG)
    const start = Math.max(0, at);
    const window = raw.slice(start, Math.min(raw.length, start + maxLookahead));
    const num = window.match(/(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/);
    return num ? toFloatBR(num[1]) : null;
  }

  const nivel         = pickNumberAfter('nivel');                 // Nível
  const vazaoAfluente = pickNumberAfter('vazao afluente');        // Vazão Afluente
  const vazaoDefluente= pickNumberAfter('vazao defluente');       // Vazão Defluente

  if (nivel == null && vazaoAfluente == null && vazaoDefluente == null) return null;
  return { cota: nivel, vazaoAfluente, vazaoDefluente };
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
