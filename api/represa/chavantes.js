export const config = { runtime: 'edge' };

/**
 * Consulta dados do reservatório de Chavantes diretamente da API pública do ONS.
 * Fonte: https://apicdgx.ons.org.br/historico/nivel
 */
export default async function handler() {
  try {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split("T")[0]; // AAAA-MM-DD

    // API pública do ONS (retorna dados diários de vários reservatórios)
    const url = `https://apicdgx.ons.org.br/historico/nivel?reservatorio=CHAVANTES&data=${dataFormatada}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Erro HTTP ${r.status}`);
    const dados = await r.json();

    if (!Array.isArray(dados) || dados.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nenhum dado encontrado para Chavantes.",
          fonte: "ONS",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
          },
        }
      );
    }

    // Pega o registro mais recente
    const info = dados[dados.length - 1];
    const corpo = {
      success: true,
      fonte: "ONS",
      cotaAtual: info.nivel ? Number(info.nivel).toFixed(2) : null,
      volumeUtil: info.volume ? Number(info.volume).toFixed(2) : null,
      vazaoAfluente: info.vazaoAfluente
        ? Number(info.vazaoAfluente).toFixed(2)
        : null,
      vazaoDefluente: info.vazaoDefluente
        ? Number(info.vazaoDefluente).toFixed(2)
        : null,
      atualizadoEm: info.data || dataFormatada,
    };

    return new Response(JSON.stringify(corpo), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
        fonte: "ONS",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      }
    );
  }
}
