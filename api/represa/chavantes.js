export const config = { runtime: 'edge' };

/**
 * API híbrida: tenta ONS (dados oficiais) e CTG (fallback HTML)
 */
export default async function handler() {
  try {
    const ons = await tentarONS();
    if (ons.ok) return responseOK({ success: true, ...ons });

    const ctg = await tentarCTG();
    if (ctg.ok) return responseOK({ success: true, ...ctg });

    return responseOK({
      success: false,
      error: 'Nenhuma fonte retornou dados válidos (ONS/CTG).',
      fonte: 'ONS/CTG'
    });
  } catch (err) {
    return responseOK({
      success: false,
      error: 'Erro interno: ' + String(err),
      fonte: 'Sistema'
    });
  }
}

/* =========== Função ONS =========== */
async function tentarONS() {
  try {
    const url = 'https://apicdgx.ons.org.br/historico/nivel?reservatorio=CHAVANTES';
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { ok: false, motivo: 'Falha HTTP ' + r.status };

    const json = await r.json();
    if (!Array.isArray(json) || json.length === 0) return { ok: false, motivo: 'Sem dados válidos' };

    const ult = json[json.length - 1];
    return {
      ok: true,
      fonte: 'ONS',
      cotaAtual: ult.nivel ? Number(ult.nivel).toFixed(2) : null,
      volumeUtil: ult.volume ? Number(ult.volume).toFixed(2) : null,
      vazaoAfluente: ult.vazaoAfluente ? Number(ult.vazaoAfluente).toFixed(2) : null,
      vazaoDefluente: ult.vazaoDefluente ? Number(ult.vazaoDefluente).toFixed(2) : null,
      atualizadoEm: ult.data || new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

/* =========== Função CTG =========== */
async function tentarCTG() {
  try {
    const url = 'https://r.jina.ai/http://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return { ok: false, motivo: 'Falha HTTP ' + r.status };

    const html = await r.text();
    const trecho = html.slice(0, 15000).replace(/\s+/g, ' ');
    const i = trecho.toLowerCase().indexOf('chavantes');
    if (i === -1) return { ok: false, motivo: 'Sem palavra Chavantes' };

    const janela = trecho.slice(i, i + 2000);
    const match = janela.match(/(\d{3,4}[.,]\d{1,2})/);
    const cota = match ? parseFloat(match[1].replace(',', '.')) : null;

    if (!cota) return { ok: false, motivo: 'Sem número válido' };
    return {
      ok: true,
      fonte: 'CTG Brasil',
      cotaAtual: cota.toFixed(2),
      volumeUtil: null,
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

/* =========== Resposta JSON padrão =========== */
function responseOK(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*'
    }
  });
}
