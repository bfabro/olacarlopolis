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
    
    // Estratégia mais robusta de parsing
    const normalizedHtml = html.toLowerCase().replace(/\s+/g, ' ');
    
    // Busca por Chavantes com contexto maior
    const chavantesIndex = normalizedHtml.indexOf('chavantes');
    if (chavantesIndex === -1) {
      return { ok: false, motivo: 'Reservatório Chavantes não encontrado' };
    }

    // Pega contexto maior para análise
    const start = Math.max(0, chavantesIndex - 200);
    const end = chavantesIndex + 1000;
    const context = normalizedHtml.slice(start, end);
    
    console.log('Contexto Chavantes:', context.slice(0, 500));

    // Padrões mais flexíveis para números
    const numberPatterns = [
      /(\d{1,3}[,.]\d{2})/g,        // 123.45 ou 123,45
      /(\d{3,4})/g,                 // 1234 ou 567
      /cota[\s:]*([\d,.-]+)/i,      // cota: 123.45
      /nível[\s:]*([\d,.-]+)/i,     // nível: 123.45
      /(\d{2,4}[,.]\d)/g           // 123.4 ou 12.34
    ];

    let cota = null;
    
    for (const pattern of numberPatterns) {
      const matches = context.match(pattern);
      if (matches) {
        // Converte e filtra números plausíveis para cota de reservatório
        const numeros = matches
          .map(m => parseFloat(m.replace(',', '.').replace(/[^\d.-]/g, '')))
          .filter(n => !isNaN(n) && n > 100 && n < 800); // Faixa plausível
        
        if (numeros.length > 0) {
          cota = numeros[0];
          console.log('Cota encontrada com padrão:', pattern, cota);
          break;
        }
      }
    }

    if (!cota) {
      return { ok: false, motivo: 'Não encontrou cota válida no contexto' };
    }

    return {
      ok: true,
      fonte: 'CTG Brasil',
      cotaAtual: cota.toFixed(2),
      volumeUtil: null,
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: new Date().toISOString(),
      observacao: 'Dados via scraping direto - pode necessitar ajuste'
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