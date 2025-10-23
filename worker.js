export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chavantes") {
      return new Response("Not found", { status: 404 });
    }

    try {
      // Página pública com os níveis por usina
      const CTG_URL = "https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/";
      const html = await (await fetch(CTG_URL, { headers: { "User-Agent": "Mozilla/5.0" }})).text();

      // Isola a seção da UHE Chavantes
      const bloco = html.split(/UHE Chavantes/i)[1] || "";
      if (!bloco) throw new Error("Bloco da UHE Chavantes não encontrado");

      // Captura data do dia (ex.: "quarta-feira, 22 de outubro de 2025")
      const mData = bloco.match(/([a-zçãé\-]+),\s*\d{1,2}\s*de\s*[a-zçãé]+\s*de\s*\d{4}/i);
      const dataTexto = mData ? mData[0] : "";

      // Captura os quatro horários e suas linhas (00:00, 06:00, 12:00, 18:00)
      const entradas = [];
      const reBlocoMedida = /(\d{2}:\d{2})[\s\S]*?Nível[\s\S]*?Defluência[\s\S]*?Volume[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)/gi;
      let m;
      while ((m = reBlocoMedida.exec(bloco))) {
        const hora = m[1];
        const nivel = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
        const defluencia = parseFloat(m[3].replace(/\./g, "").replace(",", "."));
        const volume = parseFloat(m[4].replace(/\./g, "").replace(",", "."));
        entradas.push({ hora, nivel_m: nivel, defluencia_m3s: defluencia, volume_pct: volume });
      }

      // fallback: alguns dias o HTML vem com pequenas variações; pega primeira ocorrência de números após "Nível/Defluência/Volume"
      if (!entradas.length) {
        const reLinha = /Nível[\s\S]*?([\d.,]+)[\s\S]*?Defluência[\s\S]*?([\d.,]+)[\s\S]*?Volume[\s\S]*?([\d.,]+)/i;
        const f = bloco.match(reLinha);
        if (f) {
          entradas.push({
            hora: "—",
            nivel_m: parseFloat(f[1].replace(/\./g, "").replace(",", ".")),
            defluencia_m3s: parseFloat(f[2].replace(/\./g, "").replace(",", ".")),
            volume_pct: parseFloat(f[3].replace(/\./g, "").replace(",", "."))
          });
        }
      }

      if (!entradas.length) throw new Error("Não foi possível extrair valores");

      // normalmente queremos o último horário do dia (18:00)
      const ultimo = entradas[entradas.length - 1];

      return new Response(JSON.stringify({
        usina: "UHE Chavantes",
        data_texto: dataTexto,          // exibível
        amostras: entradas,             // caso queira plotar gráfico com os 4 horários
        ultimo,                         // nível mais recente do dia
        fonte: "CTG Brasil",
        fonte_url: CTG_URL
      }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "max-age=600" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: true, message: String(err) }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }
  }
}
