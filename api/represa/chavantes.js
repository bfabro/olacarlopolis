// Força Node.js runtime (menos restrições de rede que Edge)
export const config = { runtime: 'nodejs' };

// Utilidades
async function get(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    headers: {
      'accept': opts.accept || 'application/json, text/html;q=0.9',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      ...(opts.headers || {}),
    },
    cache: 'no-store',
  });
  const ct = r.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await r.text() : await r.text();
  return { ok: r.ok, status: r.status, ct, body };
}

function toNumBR(s) {
  if (!s) return null;
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) ?? null;
}

function json200(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}

// --------- Tentativa ONS (várias datas e variações de nome) -----------
async function tentarONS(debug) {
  const base = 'https://apicdgx.ons.org.br/historico/nivel';
  const nomes = ['CHAVANTES', 'UHE CHAVANTES']; // variações que já vi funcionarem
  const hoje = new Date();

  const tentativas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const data = d.toISOString().slice(0, 10);

    for (const nome of nomes) {
      const url = `${base}?reservatorio=${encodeURIComponent(nome)}&data=${data}`;
      const res = await get(url);
      tentativas.push({ fonte: 'ONS', url, status: res.status });

      if (!res.ok) continue;

      // O endpoint às vezes responde JSON como text/plain; tentamos parse
      let arr;
      try { arr = JSON.parse(res.body); } catch { arr = null; }

      if (Array.isArray(arr) && arr.length) {
        const x = arr[arr.length - 1];
        return {
          ok: true,
          fonte: 'ONS',
          cotaAtual: x?.nivel != null ? Number(x.nivel).toFixed(2) : null,
          volumeUtil: x?.volume != null ? Number(x.volume).toFixed(2) : null,
          vazaoAfluente: x?.vazaoAfluente != null ? Number(x.vazaoAfluente).toFixed(2) : null,
          vazaoDefluente: x?.vazaoDefluente != null ? Number(x.vazaoDefluente).toFixed(2) : null,
          atualizadoEm: x?.data || data,
          _trace: debug ? { tentativas, sample: res.body.slice(0, 1200) } : undefined,
        };
      }
    }
  }
  return { ok: false, _trace: debug ? { msg: 'ONS sem dados/erro nas tentativas' } : undefined };
}

// --------- Tentativa CTG (HTML estático via proxy) -----------
async function tentarCTG(debug) {
  const urls = [
    'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
    'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
  ];
  const tentativas = [];

  for (const url of urls) {
    const res = await get(url, { accept: 'text/html' });
    tentativas.push({ fonte: 'CTG', url, status: res.status });

    if (!res.ok) continue;

    const html = res.body.replace(/\s+/g, ' ');
    // Localiza a primeira ocorrência de "UHE Chavantes" e pega uma janela grande
    const i = html.toLowerCase().indexOf('uhe chavantes');
    if (i === -1) continue;

    const win = html.slice(Math.max(0, i - 500), Math.min(html.length, i + 8000));

    // Procura o rótulo "Nível" e o primeiro número após ele
    const j = win.toLowerCase().indexOf('nível') !== -1 ? win.toLowerCase().indexOf('nível') : win.toLowerCase().indexOf('nivel');
    const bloco = j >= 0 ? win.slice(j, j + 1500) : win.slice(0, 1500);
    const m = bloco.match(/(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/);

    const cota = m ? toNumBR(m[1]) : null;
    if (cota != null) {
      return {
        ok: true,
        fonte: 'CTG Brasil',
        cotaAtual: cota.toFixed(2),
        volumeUtil: null,
        vazaoAfluente: null,
        vazaoDefluente: null,
        atualizadoEm: new Date().toISOString(),
        _trace: debug ? { tentativas, sample: bloco.slice(0, 600) } : undefined,
      };
    }
  }
  return { ok: false, _trace: debug ? { msg: 'CTG sem dados/parse' } : undefined };
}

// ------------------- Handler -------------------
export default async function handler(req) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === '2';

  try {
    // 1) ONS primeiro
    const ons = await tentarONS(debug);
    if (ons.ok) {
      const { _trace, ...body } = ons;
      return json200({ success: true, ...body, ...(debug ? { _debug: _trace } : {}) });
    }

    // 2) CTG fallback
    const ctg = await tentarCTG(debug);
    if (ctg.ok) {
      const { _trace, ...body } = ctg;
      return json200({ success: true, ...body, ...(debug ? { _debug: _trace } : {}) });
    }

    // 3) Nada deu
    return json200({
      success: false,
      error: 'Não foi possível obter dados do ONS nem da CTG.',
      fonte: 'ONS/CTG',
      ...(debug ? { _debug: { ons: ons._trace, ctg: ctg._trace } } : {}),
    });
  } catch (err) {
    return json200({ success: false, error: `Erro: ${String(err)}`, fonte: 'ONS/CTG' });
  }
}
