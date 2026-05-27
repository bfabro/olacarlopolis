// api/nivel-chavantes.js
export const config = { runtime: "edge" };

const CTG_URL = "https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";

async function parseCTG(html) {
  const chavantesIndex = html.toLowerCase().indexOf("uhe chavantes");
  if (chavantesIndex === -1) throw new Error("Nao encontrei UHE Chavantes na pagina da CTG.");

  const nextAccordion = html.indexOf('<div class="accordion-item">', chavantesIndex + 20);
  const sect = html.slice(chavantesIndex, nextAccordion > chavantesIndex ? nextAccordion : chavantesIndex + 6000);
  const dataLinha = sect.match(/<div class="col-12 data[^"]*">\s*([^<]+?)\s*<\/div>/i);
  const rows = [];
  const rowRegex = /<div class="col-2 bold">\s*(\d{2}:\d{2})\s*<\/div>[\s\S]*?<div class="row text-end bold">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="col-2">/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(sect)) !== null) {
    const values = [...rowMatch[2].matchAll(/<div class="col-12">\s*([\d.,]+)\s*<\/div>/gi)].map((m) => m[1]);
    if (values.length >= 2) rows.push({ horario: rowMatch[1], nivel: values[0], defluencia: values[1], volume: values[2] || null });
  }
  const latest = rows[rows.length - 1];
  if (!latest) throw new Error("Nao consegui extrair a ultima medicao da CTG.");

  const toNumber = (value) => Number(String(value || "").replace(/\./g, "").replace(",", "."));
  return {
    fonte: "CTG Brasil",
    usina: "UHE Chavantes",
    nivel_m: toNumber(latest.nivel),
    volume_util_pct: latest.volume ? toNumber(latest.volume) : null,
    defluencia_m3s: toNumber(latest.defluencia),
    horario: latest.horario,
    data_humana: dataLinha ? dataLinha[1].trim() : null,
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
