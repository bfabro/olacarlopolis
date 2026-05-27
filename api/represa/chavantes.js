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

    // Fallback para CTG direto (sem Jina AI)
    console.log('Tentando CTG direto...');
    const ctg = await tentarCTGDireto();
    if (ctg.ok) {
      console.log('CTG retornou dados válidos');
      return responseOK({ success: true, ...ctg });
    }
    console.log('CTG falhou:', ctg.motivo);

    // Todas as fontes falharam
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

/* =========== ONS Corrigido =========== */
async function tentarONS() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const url = 'https://apicdgx.ons.org.br/historico/nivel?reservatorio=CHAVANTES';
    console.log('Consultando ONS:', url);
    
    const r = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://ons.org.br'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Status ONS:', r.status);
    
    if (!r.ok) {
      const errorText = await r.text().catch(() => 'Sem corpo');
      return { 
        ok: false, 
        motivo: `HTTP ${r.status} - ${errorText}` 
      };
    }

    const json = await r.json();
    
    if (!Array.isArray(json) || json.length === 0) {
      return { ok: false, motivo: 'Array vazio ou inválido' };
    }

    const ult = json[json.length - 1];
    console.log('Último registro ONS:', ult);
    
    // Validação dos dados
    if (!ult.nivel && !ult.volume) {
      return { ok: false, motivo: 'Dados incompletos no ONS' };
    }
    
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
    return { 
      ok: false, 
      motivo: e.name === 'AbortError' ? 'Timeout de 10s' : e.message 
    };
  }
}

/* =========== CTG Direto (Sem Jina AI) =========== */
async function tentarCTGDireto() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // URL direta do CTG
    const url = 'https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
    console.log('Consultando CTG direto:', url);
    
    const r = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Status CTG:', r.status);
    
    if (!r.ok) {
      return { 
        ok: false, 
        motivo: `HTTP ${r.status} - ${r.statusText}` 
      };
    }

    const html = await r.text();
    console.log('Tamanho HTML CTG:', html.length);
    
    // Isola o bloco da UHE Chavantes para nao confundir "Maximo" com nivel atual.
    const chavantesIndex = html.toLowerCase().indexOf('uhe chavantes');
    if (chavantesIndex === -1) {
      return { ok: false, motivo: 'Reservatorio Chavantes nao encontrado' };
    }

    const nextAccordion = html.indexOf('<div class="accordion-item">', chavantesIndex + 20);
    const context = html.slice(chavantesIndex, nextAccordion > chavantesIndex ? nextAccordion : chavantesIndex + 6000);
    const dataMatch = context.match(/<div class="col-12 data[^"]*">\s*([^<]+?)\s*<\/div>/i);
    const rows = [];
    const rowRegex = /<div class="col-2 bold">\s*(\d{2}:\d{2})\s*<\/div>[\s\S]*?<div class="row text-end bold">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="col-2">/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(context)) !== null) {
      const values = [...rowMatch[2].matchAll(/<div class="col-12">\s*([\d.,]+)\s*<\/div>/gi)].map((m) => m[1]);
      if (values.length >= 2) {
        rows.push({
          horario: rowMatch[1],
          nivel: values[0],
          defluencia: values[1],
          volume: values[2] || null
        });
      }
    }

    const latest = rows[rows.length - 1];
    if (!latest?.nivel) return { ok: false, motivo: 'Nao encontrou linha de medicao da CTG' };

    return {
      ok: true,
      fonte: 'CTG Brasil',
      cotaAtual: latest.nivel,
      volumeUtil: latest.volume,
      vazaoAfluente: null,
      vazaoDefluente: latest.defluencia,
      atualizadoEm: new Date().toISOString(),
      dataReferencia: dataMatch ? dataMatch[1].trim() : null,
      horarioReferencia: latest.horario,
      maximo: (context.match(/M[aá]ximo\s*=\s*<strong>\s*([\d.,]+)/i) || [])[1] || null,
      minimo: (context.match(/M[ií]nimo\s*=\s*<strong>\s*([\d.,]+)/i) || [])[1] || null,
      observacao: 'Dados extraidos da ultima linha de medicao da CTG'
    };
  } catch (e) {
    console.error('Erro CTG:', e);
    return { 
      ok: false, 
      motivo: e.name === 'AbortError' ? 'Timeout de 15s' : e.message 
    };
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
