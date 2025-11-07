export const config = { runtime: 'edge' }; // pode trocar para 'nodejs' se preferir

export default async function handler(req) {
  try {
    const urlReader = 'https://r.jina.ai/http://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    const resp = await fetch(urlReader, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Falha ao acessar fonte CTG');
    const html = await resp.text();

    // tenta capturar cota e volume na linha de "Chavantes"
    const linhaRe = /Chavantes[\s\S]{0,300}?(\d{3,4}[.,]\d{1,2})[\s\S]{0,200}?(\d{1,3}[.,]\d{1,2})%/i;
    const m = html.match(linhaRe);

    const cota = m ? m[1].replace(',', '.') : null;
    const volume = m ? m[2].replace(',', '.') : null;

    const agora = new Date();
    const payload = {
      success: Boolean(cota),
      fonte: 'CTG Brasil',
      cotaAtual: cota ? Number(cota).toFixed(2) : null,
      volumeUtil: volume ? Number(volume).toFixed(2) : null,
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: agora.toISOString()
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: String(err),
      fonte: 'CTG Brasil'
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*'
      }
    });
  }
}
