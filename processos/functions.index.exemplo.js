const { onRequest } = require("firebase-functions/v2/https");

/*
  EXEMPLO DE BACKEND PARA A TELA.
  1) consultarCnpj: pronto para uso com publica.cnpj.ws
  2) consultarProcessosCnpj: EXEMPLO DE CONTRATO NORMALIZADO
     -> você precisa ligar esse endpoint ao seu provedor/processo judicial preferido.
     -> a tela HTML já sabe ler o JSON devolvido aqui.
*/

exports.consultarCnpj = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      const cnpj = String(req.query.cnpj || "").replace(/\D/g, "");
      if (cnpj.length !== 14) {
        return res.status(400).json({ ok: false, mensagem: "CNPJ inválido." });
      }

      const url = `https://publica.cnpj.ws/cnpj/${cnpj}`;
      const resposta = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      const texto = await resposta.text();
      let json;
      try {
        json = JSON.parse(texto);
      } catch {
        return res.status(502).json({
          ok: false,
          mensagem: "A API de CNPJ não retornou JSON válido."
        });
      }

      return res.status(resposta.status).json(json);
    } catch (erro) {
      return res.status(500).json({
        ok: false,
        mensagem: "Erro ao consultar CNPJ.",
        detalhe: erro.message
      });
    }
  }
);

exports.consultarProcessosCnpj = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      const cnpj = String(req.query.cnpj || "").replace(/\D/g, "");
      if (cnpj.length !== 14) {
        return res.status(400).json({ ok: false, mensagem: "CNPJ inválido." });
      }

      /*
        AQUI ENTRA SUA INTEGRAÇÃO REAL.
        A tela espera algo assim:

        {
          "ok": true,
          "total": 2,
          "tribunaisConsultados": ["TJPR", "TRT9"],
          "processos": [
            {
              "id": "abc123",
              "tribunal": "TJPR",
              "numeroProcesso": "00000000000000000000",
              "classe": "Execução Fiscal",
              "orgaoJulgador": "Vara X",
              "grau": "G1",
              "dataAjuizamento": "2024-02-10T00:00:00.000Z",
              "atualizadoEm": "2026-03-26T00:00:00.000Z"
            }
          ]
        }

        Enquanto isso, abaixo vai um RETORNO DE EXEMPLO.
      */

      const retornoExemplo = {
        ok: true,
        total: 0,
        tribunaisConsultados: [],
        processos: []
      };

      return res.status(200).json(retornoExemplo);
    } catch (erro) {
      return res.status(500).json({
        ok: false,
        mensagem: "Erro ao consultar processos.",
        detalhe: erro.message
      });
    }
  }
);
