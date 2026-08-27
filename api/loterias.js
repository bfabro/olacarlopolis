// Agregador publico das Loterias CAIXA - v3
import { carregarResultados } from "../shared/loterias-core.mjs";

export const config = { runtime: "edge" };

export default async function handler(request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const resultados = await carregarResultados(force);
  const disponiveis = resultados.filter((item) => item.ok).length;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store, no-cache, must-revalidate",
    pragma: "no-cache",
    expires: "0"
  };
  return new Response(JSON.stringify({ fonte: "Loterias CAIXA", consultadoEm: new Date().toISOString(), cacheSegundos: 0, resultados }), { status: disponiveis ? 200 : 502, headers });
}
