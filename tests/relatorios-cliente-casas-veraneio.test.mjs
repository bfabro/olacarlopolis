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

test("casas de veraneio possuem cards proprios no monitoramento", () => {
  assert.match(adminJs, /const casasVeraneioEntries = availability\.casasVeraneio/);
  assert.match(adminJs, /title: "Casas de veraneio"/);
  assert.match(adminJs, /entries: casasVeraneioEntries/);
  assert.match(adminJs, /total: casasVeraneio/);
});

test("tabelas do relatorio iniciam recolhidas", () => {
  assert.match(adminJs, /function renderClientReportDisclosure\(title, content, description = "Clique para visualizar", expanded = false\)/);
  assert.doesNotMatch(adminJs, /"Todos os cliques do cliente",[\s\S]{0,240}\btrue\s*\)/);
});

test("propriedades recebem referencia incremental baseada no nome", () => {
  assert.match(adminJs, /casa_veraneio: \{ path: "contadores\/codigosReferencia\/casasVeraneio", prefix: "" \}/);
  assert.match(adminJs, /gerarCodigoReferenciaIncremental\("casa_veraneio", payload\.titulo\)/);
  assert.match(adminJs, /String\(next\)\.padStart\(3, "0"\)/);
  assert.match(adminJs, /await ensureVacationRentalReferenceCodes\(\)/);
  assert.match(publicJs, /codRef: item\.codRef \|\| item\.codigoReferencia \|\| item\.id/);
});

test("pagina do cliente aparece apenas quando existe area publica real", () => {
  assert.match(adminJs, /function clientReportHasPublicProfile\(client = \{\}\)/);
  assert.match(adminJs, /!isCategorylessClientType\(client\)/);
  assert.match(adminJs, /perfil: hasPublicProfile/);
  assert.match(adminJs, /availability\.perfil \? renderClientReportMonitorSection/);
  assert.match(adminJs, /const canShowOrigemAcessos = availability\.perfil && clientReportHasPermission/);
});

test("cliente sem perfil publico mantem apenas metricas dos modulos habilitados", () => {
  assert.match(adminJs, /if \(availability\.perfil\) return true/);
  assert.match(adminJs, /casaveraneio\|imovel\|veiculo\|automovel\|produto\|servico\|promoc\|cardapio\|ondecomer/);
  assert.match(adminJs, /compartilhamentos: hasPublicProfile/);
  assert.match(adminJs, /outrasRedes: hasPublicProfile/);
  assert.match(adminJs, /const produtosEntries = produtosAtivo \? \[/);
  assert.match(adminJs, /const servicosEntries = servicosAtivo \? \[/);
  assert.match(adminJs, /const promocoesEntries = promocoesAtivo \? \[/);
  assert.match(adminJs, /const ondeComerEntries = ondeComerAtivo \? \[/);
});
