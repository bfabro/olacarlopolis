export const config = { runtime: 'edge' };

export default async function handler() {
  console.log('Iniciando consulta Chavantes...');
  
  try {
    // Tenta ONS primeiro
    console.log('Tentando ONS...');
    const ons = await tentarONS();
    if (ons.ok) {
      console.log('ONS retornou dados válidos');
      return responseOK({ success: true, ...ons });
    }
    console.log('ONS falhou:', ons.motivo);

    // Fallback para CTG
    console.log('Tentando CTG...');
    const ctg = await tentarCTG();
    if (ctg.ok) {
      console.log('CTG retornou dados válidos');
      return responseOK({ success: true, ...ctg });
    }
    console.log('CTG falhou:', ctg.motivo);

    // Todas as fontes falharam
    console.log('Todas as fontes falharam');
    return responseOK({
      success: false,
      error: 'Nenhuma fonte retornou dados válidos (ONS/CTG).',
      fonte: 'ONS/CTG',
      detalhes: {
        ons: ons.motivo,
        ctg: ctg.motivo
      }
    });

  } catch (err) {
    console.error('Erro geral:', err);
    return responseOK({
      success: false,
      error: 'Erro interno: ' + String(err),
      fonte: 'Sistema'
    });
  }
}

/* =========== ONS Melhorado =========== */
async function tentarONS() {
  try {
    const url = 'https://apicdgx.ons.org.br/historico/nivel?reservatorio=CHAVANTES';
    console.log('Consultando ONS:', url);
    
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitoringBot/1.0)',
        'Accept': 'application/json'
      }
    });
    
    console.log('Status ONS:', r.status);
    
    if (!r.ok) {
      return { 
        ok: false, 
        motivo: `HTTP ${r.status} - ${await r.text().catch(() => 'Sem corpo de resposta')}` 
      };
    }

    const json = await r.json();
    console.log('Resposta ONS:', JSON.stringify(json).slice(0, 200));
    
    if (!Array.isArray(json) || json.length === 0) {
      return { ok: false, motivo: 'Array vazio ou inválido' };
    }

    const ult = json[json.length - 1];
    console.log('Último registro ONS:', ult);
    
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
    console.error('Erro ONS:', e);
    return { ok: false, motivo: e.message };
  }
}

/* =========== CTG Melhorado =========== */
async function tentarCTG() {
  try {
    const url = 'https://r.jina.ai/http://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    console.log('Consultando CTG via Jina AI');
    
    const r = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonitoringBot/1.0)'
      }
    });
    
    console.log('Status CTG:', r.status);
    
    if (!r.ok) {
      return { ok: false, motivo: `HTTP ${r.status}` };
    }

    const html = await r.text();
    console.log('Tamanho HTML CTG:', html.length);
    
    // Estratégia mais robusta para encontrar Chavantes
    const htmlLower = html.toLowerCase();
    const chavantesIndex = htmlLower.indexOf('chavantes');
    
    if (chavantesIndex === -1) {
      // Busca alternativa
      const possibleIndex = htmlLower.indexOf('chavant');
      if (possibleIndex === -1) {
        return { ok: false, motivo: 'Reservatório não encontrado no HTML' };
      }
    }

    const searchIndex = chavantesIndex !== -1 ? chavantesIndex : htmlLower.indexOf('chavant');
    const context = html.slice(Math.max(0, searchIndex - 100), searchIndex + 500);
    console.log('Contexto encontrado:', context.slice(0, 300));

    // Múltiplos padrões para encontrar números
    const patterns = [
      /(\d{3,4}[,.]\d{1,2})/g,
      /(\d{3,4})/g,
      /(\d{2,4}[,.]\d+)/g
    ];

    let cota = null;
    for (const pattern of patterns) {
      const matches = context.match(pattern);
      if (matches) {
        // Filtra números plausíveis para cota (normalmente entre 400-600)
        const numeros = matches.map(m => parseFloat(m.replace(',', '.')))
                              .filter(n => n > 300 && n < 800);
        if (numeros.length > 0) {
          cota = numeros[0];
          break;
        }
      }
    }

    if (!cota) {
      return { ok: false, motivo: 'Não encontrou número válido no contexto' };
    }

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
    console.error('Erro CTG:', e);
    return { ok: false, motivo: e.message };
  }
}

function responseOK(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*'
    }
  });
}