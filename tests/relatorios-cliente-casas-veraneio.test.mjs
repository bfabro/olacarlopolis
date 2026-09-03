import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publicJs = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const adminJs = readFileSync(new URL("../admin/painel.js", import.meta.url), "utf8");

test("relatorio individual usa as permissoes do cliente selecionado", () => {
  assert.match(adminJs, /function clientReportPermissions\(client = currentClientRecord\(\) \|\| \{\}\)/);
  assert.match(adminJs, /\.filter\(\(user\) => String\(user\.clienteId \|\| ""\) === String\(client\.id \|\| ""\)\)/);
  assert.match(adminJs, /const produtosAtivo = clientReportHasPermission\(client, "produtos"\)/);
  assert.match(adminJs, /const servicosAtivo = clientReportHasPermission\(client, "servicos"\)/);
  assert.match(adminJs, /const promocoesAtivo = clientReportHasPermission\(client, "promocoes"\)/);
  assert.match(adminJs, /const hasVacationRentals = clientReportHasPermission\(client, "casas_veraneio"\)/);
});

test("cliques das casas de veraneio alimentam a tabela por propriedade", () => {
  assert.match(publicJs, /function registrarCliqueCasaVeraneio\(tipo, item = \{\}, detalhes = \{\}\)/);
  assert.match(publicJs, /`casa_veraneio_\$\{tipo\}`/);
  assert.match(publicJs, /casaVeraneioId: item\.id/);
  assert.match(adminJs, /if \(\/casaveraneio\|casasveraneio\/\.test\(text\)\) return "Casas de veraneio"/);
  assert.match(adminJs, /function renderVacationRentalAccessTable/);
  assert.match(adminJs, /Modulo especial: Casas de veraneio/);
});
