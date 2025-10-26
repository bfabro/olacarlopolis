// api/nivel-chavantes.js
export const config = { runtime: "edge" };

const CTG_URL = "https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";

async function parseCTG(html) {
  // Isola o bloco da UHE Chavantes
  const sect = html.split("UHE Chavantes")[1] || "";
  // Pega o primeiro triplo Nível/Defluência/Volume que aparece após o título
  // Ex.: ... Nível ... 469,75 ... Defluência ... 126,80 ... Volume ... 47,75 ...
  const num = sect.match(/N[ií]vel[\s\S]*?([\d.,]+)[\s\S]*?Deflu[êe]ncia[\s\S]*?([\d.,]+)[\s\S]*?Volume[\s\S]*?([\d.,]+)/i);
  if (!num) throw new Error("Não consegui extrair números da CTG.");

  const nivel_m = num[1].replace(/\./g, "").replace(",", ".");      // metros
  const deflu_m3s = num[2].replace(/\./g, "").replace(",", ".");    // m³/s
  const volume_pct = num[3].replace(/\./g, "").replace(",", ".");   // %

  // Data (linha “domingo, 26 de outubro de 2025” ou similar)
  const dataLinha = sect.match(/(\w+,\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
  const data = dataLinha ? dataLinha[1] : null;

  return {
    fonte: "CTG Brasil",
    usina: "UHE Chavantes",
    nivel_m: Number(nivel_m),
    volume_util_pct: Number(volume_pct),
    defluencia_m3s: Number(deflu_m3s),
    data_humana: data,
    updated_from: CTG_URL,
  };
}

export default async function handler() {
  try {
    const resp = await fetch(CTG_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) throw new Error("Falha ao baixar página da CTG.");
    const html = await resp.text();

    const dados = await parseCTG(html);

    return new Response(JSON.stringify(dados, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, s-maxage=900, max-age=300" ,// 15min edge cache
         "access-control-allow-origin": "*"   // <<<<<<<<<<<<<< ADICIONE
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: true, message: e.message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8",   "access-control-allow-origin": "*"  } // <<<<<<<<<<<<<< ADICIONE}
    });
  }
}
