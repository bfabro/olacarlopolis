export const config = { runtime: 'edge' };

/**
 * Busca texto de uma URL com user-agent de navegador (alguns WAFs bloqueiam UA genérico)
 */
async function fetchText(url) {
  const r = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

/**
 * Normaliza: minúsculas, remove acentos, comprime espaços.
 */
function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")      // remove acentos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tenta extrair cota (m) e volume (%) a partir de um ponto onde aparece “chavantes”
 * Faz o parse no HTML original, mas usa a posição obtida no texto normalizado
 */
function parseChavantes(html) {
  const norm = normalize(html);

  // palavras-chave possíveis perto do nome
  const needles = [
    "chavantes",
    "uhe chavantes",
    "usina chavantes",
    "reservatorio chavantes",
  ];

  // acha o primeiro índice que aparecer
  let at = -1;
  for (const n of needles) {
    at = norm.indexOf(n);
    if (at !== -1) break;
  }
  if (at === -1) return { ok: false, why: "keyword_not_found" };

  // converte índice do normalizado para uma janela do HTML bruto
  // (usamos uma janela generosa para capturar números próximos)
  const start = Math.max(0, at - 1500);
  const end = Math.min(html.length, at + 3000);
  const windowHtml = html.slice(start, end);

  // padrões de números
  // cota: 3-4 dígitos + , ou . + duas casas — ex: 416,32 / 416.32
  // volume: número seguido de % — ex: 52,31 %
  // fazemos múltiplas tentativas
  const tryPatterns = [
    // 1) ...Chavantes... Cota 416,32 ... 52,31%
    /(?:Cota[^0-9]{0,15})?(\d{3,4}[.,]\d{1,2})[\s\S]{0,400}?(\d{1,3}[.,]\d{1,2})\s*%/i,
    // 2) ... 416,32 m ... 52,31 %
    /(\d{3,4}[.,]\d{1,2})\s*m[\s\S]{0,400}?(\d{1,3}[.,]\d{1,2})\s*%/i,
    // 3) volume antes da cota (algumas páginas mudam a ordem)
    /(\d{1,3}[.,]\d{1,2})\s*%[\s\S]{0,400}?(\d{3,4}[.,]\d{1,2})\s*m?/i,
  ];

  for (const rx of tryPatterns) {
    const m = windowHtml.match(rx);
    if (m) {
      // decide qual é cota e qual é volume conforme o pattern
      let cotaStr, volStr;

      if (rx === tryPatterns[2]) {
        volStr = m[1];
        cotaStr = m[2];
      } else {
        cotaStr = m[1];
        volStr = m[2];
      }

      const cota = parseFloat(cotaStr.replace(",", "."));
      const volume = parseFloat(volStr.replace(",", "."));
      if (!Number.isNaN(cota) && !Number.isNaN(volume)) {
        return { ok: true, cota, volume, windowHtml };
      }
    }
  }

  return { ok: false, why: "numbers_not_found", windowHtml };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug"); // "1" ou "2" para mais detalhes
  const tried = [];

  try {
    // 1) Tenta direto (Edge não sofre CORS de navegador)
    const u1 =
      "https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";
    let html;
    try {
      html = await fetchText(u1);
      tried.push({ url: u1, ok: true });
    } catch (e1) {
      tried.push({ url: u1, ok: false, why: String(e1) });
    }

    // 2) Proxy https→https (se o direto falhar)
    if (!html) {
      const u2 =
        "https://r.jina.ai/https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";
      try {
        html = await fetchText(u2);
        tried.push({ url: u2, ok: true });
      } catch (e2) {
        tried.push({ url: u2, ok: false, why: String(e2) });
      }
    }

    // 3) Variação de host (sem www)
    if (!html) {
      const u3 =
        "https://r.jina.ai/https://ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";
      try {
        html = await fetchText(u3);
        tried.push({ url: u3, ok: true });
      } catch (e3) {
        tried.push({ url: u3, ok: false, why: String(e3) });
      }
    }

    if (!html) {
      return respondFail(
        "Não foi possível baixar a página da CTG.",
        debug && { tried }
      );
    }

    const parsed = parseChavantes(html);
    if (!parsed.ok) {
      return respondFail(
        parsed.why === "keyword_not_found"
          ? "Não foi possível localizar 'Chavantes' no HTML."
          : "Não foi possível localizar números de cota/volume próximos.",
        debug && {
          tried,
          // no debug=2 devolvemos um pedaço do HTML para inspeção
          sample:
            debug === "2" && parsed.windowHtml
              ? parsed.windowHtml.slice(0, 2000)
              : undefined,
        }
      );
    }

    const body = {
      success: true,
      fonte: "CTG Brasil",
      cotaAtual: parsed.cota.toFixed(2),
      volumeUtil: parsed.volume.toFixed(2),
      vazaoAfluente: null,
      vazaoDefluente: null,
      atualizadoEm: new Date().toISOString(),
      ...(debug ? { _debug: { tried } } : {}),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return respondFail(String(err), debug && { tried });
  }
}

function respondFail(msg, extra) {
  return new Response(
    JSON.stringify({ success: false, error: msg, fonte: "CTG Brasil", ...(extra ? { _debug: extra } : {}) }),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } }
  );
}
