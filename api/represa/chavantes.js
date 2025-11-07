export const config = { runtime: 'edge' };

// ==== helpers ===============================================================
async function fetchText(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    // alguns WAFs bloqueiam user-agents "genéricos", então setamos um UA comum
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// procura a linha de "Chavantes" e extrai cota (m) e volume (%)
function parseChavantes(html) {
  // torne mais permissivo: 400 chars pra frente da palavra
  const m = html.match(/Chavantes[\s\S]{0,400}?(\d{3,4}[.,]\d{1,2})[\s\S]{0,250}?(\d{1,3}[.,]\d{1,2})%/i);
  if (!m) return null;
  const cota = m[1].replace(',', '.');
  const volume = m[2].replace(',', '.');
  return { cota, volume };
}

// ==== handler ============================================================== 
export default async function handler() {
  try {
    // 1) TENTA DIRETO NO SITE (sem proxy)
    // (Edge runtime não tem CORS de navegador)
    const urlDireta =
      'https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    let html;
    try {
      html = await fetchText(urlDireta);
    } catch (e1) {
      // 2) TENTA VIA PROXY HTTPS→HTTPS
      const urlJinaHttps =
        'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
      try {
        html = await fetchText(urlJinaHttps);
      } catch (e2) {
        // 3) TENTA VARIAÇÃO DE HOST
        const urlJinaSemWWW =
          'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
        html = await fetchText(urlJinaSemWWW);
      }
    }

    const parsed = parseChavantes(html);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não foi possível localizar a linha de Chavantes na página da CTG.',
          fonte: 'CTG Brasil',
        }),
        { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } },
      );
    }

    const agora = new Date();
    const payload = {
      success: true,
      fonte: 'CTG Brasil',
      cotaAtual: Number(parsed.cota).toFixed(2),
      volumeUtil: Number(parsed.volume).toFixed(2),
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: agora.toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store', 
        'access-control-allow-origin': '*',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err), fonte: 'CTG Brasil' }),
      { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } },
    );
  }
}
