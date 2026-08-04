/* Coleta diaria da Represa de Chavantes v1 */
const DEFAULT_SOURCE_URL = "https://olacarlopolis.vercel.app/api/represa/chavantes";
const DEFAULT_DATABASE_URL = "https://contadoracessos-default-rtdb.firebaseio.com";

function numero(valor) {
  const texto = String(valor ?? "").trim();
  const encontrado = texto.match(/-?\d{1,3}(?:\.\d{3})*,\d+|-?\d+(?:[.,]\d+)?/);
  if (!encontrado) return null;
  const normalizado = encontrado[0].includes(",")
    ? encontrado[0].replace(/\./g, "").replace(",", ".")
    : encontrado[0];
  const resultado = Number(normalizado);
  return Number.isFinite(resultado) ? resultado : null;
}

function partesDataSaoPaulo(data) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data).reduce((resultado, parte) => {
    if (parte.type !== "literal") resultado[parte.type] = parte.value;
    return resultado;
  }, {});

  return {
    chave: `${partes.year}-${partes.month}-${partes.day}`,
    dataLabel: `${partes.day}/${partes.month}/${partes.year}`,
    horario: `${partes.hour}:${partes.minute}`,
  };
}

function criarRegistro(dados) {
  const agora = new Date();
  const dataLocal = partesDataSaoPaulo(agora);
  const cota = numero(dados.cotaAtual ?? dados.cota ?? dados.nivel ?? dados.nivel_m);
  const volume = numero(dados.volumeUtil ?? dados.volume ?? dados.volumeUtilPct ?? dados.volume_util_pct);
  const defluencia = numero(dados.vazaoDefluente ?? dados.defluente ?? dados.defluencia_m3s);
  const afluencia = numero(dados.vazaoAfluente ?? dados.afluente);

  if (!Number.isFinite(cota)) throw new Error("A fonte não retornou uma cota válida.");
  if (cota < 350 || cota > 500) throw new Error(`Cota fora do intervalo esperado: ${cota}.`);

  return {
    id: `${dataLocal.chave}-automatico`,
    dataISO: agora.toISOString(),
    dataLabel: dataLocal.dataLabel,
    horario: dados.horarioReferencia || dados.horario || dataLocal.horario,
    cota,
    volume,
    defluencia,
    afluencia,
    fonte: dados.fonte || "CTG Brasil",
    automatico: true,
    salvoEm: Date.now(),
  };
}

export default async function handler() {
  try {
    const sourceUrl = Netlify.env.get("REPRESA_SOURCE_URL") || DEFAULT_SOURCE_URL;
    const databaseUrl = (Netlify.env.get("FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL).replace(/\/$/, "");
    const databaseAuth = Netlify.env.get("FIREBASE_DATABASE_AUTH");

    const sourceResponse = await fetch(sourceUrl, {
      headers: { Accept: "application/json", "User-Agent": "Ola-Carlopolis-Represa-Daily/1.0" },
    });
    if (!sourceResponse.ok) throw new Error(`Fonte retornou HTTP ${sourceResponse.status}.`);

    const dados = await sourceResponse.json();
    if (dados?.success === false) throw new Error(dados.error || "A fonte não retornou dados válidos.");

    const registro = criarRegistro(dados);
    const authQuery = databaseAuth ? `?auth=${encodeURIComponent(databaseAuth)}` : "";
    const destino = `${databaseUrl}/represas/chavantes/historico/${encodeURIComponent(registro.id)}.json${authQuery}`;
    const saveResponse = await fetch(destino, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
    });
    if (!saveResponse.ok) throw new Error(`Firebase retornou HTTP ${saveResponse.status}.`);

    console.log(`Medição diária da represa salva em ${registro.id}: ${registro.cota.toFixed(2)} m.`);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Falha na coleta diária da Represa de Chavantes:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const config = {
  // 12:15 UTC corresponde a 09:15 no horario de Brasilia.
  schedule: "15 12 * * *",
};
