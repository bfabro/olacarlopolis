export const config = { runtime: 'edge' };

async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    },
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function toFloat(s) {
  if (!s) return null;
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || null;
}

/* =============== 1️⃣  ONS (via dados.gov.br) =============== */
async function tentarONS() {
  try {
    // Dataset oficial do ONS/Dados Abertos
    const url = 'https://apicdgx.ons.org.br/historico/nivel?reservatorio=CHAVANTES';
    const data = await fetchJson(url);
    if (!Array.isArray(data) || !data.length) throw new Error('sem dados');

    const ult = data[data.length - 1];
    return {
      ok: true,
      fonte: 'ONS (dados.gov.br)',
      cotaAtual: ult.nivel ? Number(ult.nivel).toFixed(2) : null,
      volumeUtil: ult.volume ? Number(ult.volume).toFixed(2) : null,
      vazaoAfluente: ult.vazaoAfluente ? Number(ult.vazaoAfluente).toFixed(2) : null,
      vazaoDefluente: ult.vazaoDefluente ? Number(ult.vazaoDefluente).toFixed(2) : null,
      atualizadoEm: ult.data || new Date().toISOString()
    };
  } catch {
    return { ok: false };
  }
}

/* =============== 2️⃣  CTG (fallback HTML) =============== */
async function tentarCTG() {
  try {
    const html = await fetchText('https://r.jina.ai/http://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/');
    const clean = html.replace(/\s+/g, ' ');
    const blocos = clean.split(/<\/?div[^>]*>/i);

    const chav = blocos.find(b => b.toLowerCase().includes('chavantes'));
    if (!chav) throw new Error('sem bloco Chavantes');

    // procurar número próximo a "Nível" ou "m"
    const match = chav.match(/(\d{3,4}[.,]\d{1,2})/);
    const cota = match ? toFloat(match[1]) : null;

    if (!cota) throw new Error('sem número válido');

    return {
      ok: true,
      fonte: 'CTG Brasil',
      cotaAtual: cota.toFixed(2),
      volumeUtil: null,
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: new Date().toISOString()
    };
  } catch {
    return { ok: false };
  }
}

/* =============== Handler unificado =============== */
export default async function handler() {
  try {
    // 1º: ONS
    const ons = await tentarONS();
    if (ons.ok) return jsonOK({ success: true, ...ons });

    // 2º: CTG (fallback)
    const ctg = await tentarCTG();
    if (ctg.ok) return jsonOK({ success: true, ...ctg });

    // 3º: nenhum dos dois
    return jsonOK({
      success: false,
      error: 'Não foi possível obter dados nem do ONS nem da CTG.',
      fonte: 'ONS/CTG'
    });
  } catch (err) {
    return jsonOK({ success: false, error: String(err), fonte: 'ONS/CTG' });
  }
}

/* =============== Resposta JSON formatada =============== */
function jsonOK(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    }
  });
}
