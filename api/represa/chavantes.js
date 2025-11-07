export const config = { runtime: 'edge' };

/* =============== utils =============== */
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
  return r.text();
}

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'Mozilla/5.0'
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} @ ${url}`);
  return r.json();
}

function toFloatBR(s) {
  if (s == null) return null;
  const v = parseFloat(String(s).replace(/\./g,'').replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

/* =============== ONS =============== */
/** Tenta obter dados diários do ONS; se não houver dados hoje, tenta D-1, D-2… */
async function tentarONS(reservatorio = 'CHAVANTES', diasBack = 5) {
  const base = 'https://apicdgx.ons.org.br/historico/nivel';
  const hoje = new Date();

  for (let i = 0; i <= diasBack; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const data = d.toISOString().slice(0,10); // AAAA-MM-DD

    const url = `${base}?reservatorio=${encodeURIComponent(reservatorio)}&data=${data}`;
    try {
      const arr = await fetchJson(url);
      if (Array.isArray(arr) && arr.length) {
        const info = arr[arr.length - 1];
        return {
          ok: true,
          fonte: 'ONS',
          cotaAtual: info.nivel != null ? Number(info.nivel).toFixed(2) : null,
          volumeUtil: info.volume != null ? Number(info.volume).toFixed(2) : null,
          vazaoAfluente: info.vazaoAfluente != null ? Number(info.vazaoAfluente).toFixed(2) : null,
          vazaoDefluente: info.vazaoDefluente != null ? Number(info.vazaoDefluente).toFixed(2) : null,
          atualizadoEm: info.data || data
        };
      }
    } catch {
      // segue tentando datas anteriores / fallback CTG
    }
  }
  return { ok: false };
}

/* =============== CTG (fallback) =============== */
/** Tenta extrair ao menos a COTA diretamente do site da CTG (HTML) */
async function tentarCTG() {
  // reader https->https para reduzir bloqueios
  const urls = [
    'https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/',
    'https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/'
  ];
  let html = null;
  for (const u of urls) {
    try { html = await fetchText(u); break; } catch {}
  }
  if (!html) return { ok: false };

  // procurar por “Chavantes” e um número de nível próximo
  const norm = (s)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const nh = norm(html);
  const i = nh.indexOf('chavantes');
  if (i === -1) return { ok: false };

  const start = Math.max(0, i - 1000), end = Math.min(html.length, i + 6000);
  const win = html.slice(start, end);

  // pegue o primeiro número com decimais após a palavra “Nível”
  const idxNivel = norm(win).indexOf('nivel');
  const corte = idxNivel >= 0 ? win.slice(idxNivel, idxNivel + 1500) : win.slice(0, 1500);
  const m = corte.match(/(\d{1,3}(?:\.\d{3})*[.,]\d{1,2})/);
  const cota = m ? toFloatBR(m[1]) : null;

  if (cota == null) return { ok: false };
  return {
    ok: true,
    fonte: 'CTG Brasil',
    cotaAtual: cota.toFixed(2),
    volumeUtil: null,
    vazaoAfluente: null,
    vazaoDefluente: null,
    atualizadoEm: new Date().toISOString()
  };
}

/* =============== handler unificado =============== */
export default async function handler(req) {
  try {
    // 1) tenta ONS (mais completo)
    const ons = await tentarONS('CHAVANTES', 7);
    if (ons.ok) {
      return json200({ success: true, ...ons });
    }

    // 2) fallback CTG (cota ao menos)
    const ctg = await tentarCTG();
    if (ctg.ok) {
      return json200({ success: true, ...ctg });
    }

    return json200({ success: false, error: 'Não foi possível obter dados do ONS nem da CTG.', fonte: 'ONS/CTG' });
  } catch (err) {
    return json200({ success: false, error: `Erro: ${String(err)}`, fonte: 'ONS/CTG' });
  }
}

function json200(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    }
  });
}
