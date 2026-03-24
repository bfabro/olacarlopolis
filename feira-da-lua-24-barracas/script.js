const FEIRA_DA_LUA_DATA = [
/* ===============================
   BARRACA 01
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-01",
  numero: 1,
  nome: "Barraca 01 - Nome do Comércio",
  responsavel: "Responsável 01",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5543999000101",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#4070f4,#5b87f7)",
  pos: { x: 26, y: 8 },
  produtos: [
    { nome: "X-Salada", preco: 10, descricao: "Item principal da barraca 01." },
    { nome: "Hambúrguer Artesanal", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Batata Frita", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 02
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-02",
  numero: 2,
  nome: "Barraca 02 - Nome do Comércio",
  responsavel: "Responsável 02",
  categoria: "Doces",
  descricao: "Doces caseiros, sobremesas e delícias artesanais.",
  whatsapp: "5543999000202",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#8b5cf6,#ec4899)",
  pos: { x: 26, y: 16 },
  produtos: [
    { nome: "Brigadeiro Gourmet", preco: 12, descricao: "Item principal da barraca 02." },
    { nome: "Bolo no Pote", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Palha Italiana", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 03
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-03",
  numero: 3,
  nome: "Barraca 03 - Nome do Comércio",
  responsavel: "Responsável 03",
  categoria: "Hortifruti",
  descricao: "Verduras, legumes e frutas selecionadas.",
  whatsapp: "5543999000303",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#22c55e,#84cc16)",
  pos: { x: 26, y: 24 },
  produtos: [
    { nome: "Alface Crespa", preco: 14, descricao: "Item principal da barraca 03." },
    { nome: "Tomate", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Cheiro-Verde", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 04
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-04",
  numero: 4,
  nome: "Barraca 04 - Nome do Comércio",
  responsavel: "Responsável 04",
  categoria: "Artesanato",
  descricao: "Peças criativas e itens produzidos à mão.",
  whatsapp: "5543999000404",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f59e0b,#ef4444)",
  pos: { x: 26, y: 32 },
  produtos: [
    { nome: "Chaveiro Artesanal", preco: 16, descricao: "Item principal da barraca 04." },
    { nome: "Vela Aromática", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Peça Decorativa", preco: 14, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 05
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-05",
  numero: 5,
  nome: "Barraca 05 - Nome do Comércio",
  responsavel: "Responsável 05",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999000505",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#06b6d4,#10b981)",
  pos: { x: 26, y: 40 },
  produtos: [
    { nome: "Suco Natural", preco: 10, descricao: "Item principal da barraca 05." },
    { nome: "Refrigerante Lata", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Água Gelada", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 06
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-06",
  numero: 6,
  nome: "Barraca 06 - Nome do Comércio",
  responsavel: "Responsável 06",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999000606",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f97316,#fb7185)",
  pos: { x: 26, y: 48 },
  produtos: [
    { nome: "Pastel de Carne", preco: 12, descricao: "Item principal da barraca 06." },
    { nome: "Pastel de Queijo", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Pastel de Frango", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 07
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-07",
  numero: 7,
  nome: "Barraca 07 - Nome do Comércio",
  responsavel: "Responsável 07",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999000707",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#d97706,#f59e0b)",
  pos: { x: 26, y: 56 },
  produtos: [
    { nome: "Pão Caseiro", preco: 14, descricao: "Item principal da barraca 07." },
    { nome: "Cuca Tradicional", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Biscoito Colonial", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 08
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-08",
  numero: 8,
  nome: "Barraca 08 - Nome do Comércio",
  responsavel: "Responsável 08",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999000808",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#14b8a6,#22c55e)",
  pos: { x: 26, y: 64 },
  produtos: [
    { nome: "Molho de Pimenta", preco: 16, descricao: "Item principal da barraca 08." },
    { nome: "Conserva da Casa", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Tempero Verde", preco: 14, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 09
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-09",
  numero: 9,
  nome: "Barraca 09 - Nome do Comércio",
  responsavel: "Responsável 09",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5543999000909",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#4070f4,#5b87f7)",
  pos: { x: 26, y: 72 },
  produtos: [
    { nome: "X-Salada", preco: 10, descricao: "Item principal da barraca 09." },
    { nome: "Hambúrguer Artesanal", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Batata Frita", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 10
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-10",
  numero: 10,
  nome: "Barraca 10 - Nome do Comércio",
  responsavel: "Responsável 10",
  categoria: "Doces",
  descricao: "Doces caseiros, sobremesas e delícias artesanais.",
  whatsapp: "5543999001010",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#8b5cf6,#ec4899)",
  pos: { x: 26, y: 80 },
  produtos: [
    { nome: "Brigadeiro Gourmet", preco: 12, descricao: "Item principal da barraca 10." },
    { nome: "Bolo no Pote", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Palha Italiana", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 11
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-11",
  numero: 11,
  nome: "Barraca 11 - Nome do Comércio",
  responsavel: "Responsável 11",
  categoria: "Hortifruti",
  descricao: "Verduras, legumes e frutas selecionadas.",
  whatsapp: "5543999001111",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#22c55e,#84cc16)",
  pos: { x: 26, y: 88 },
  produtos: [
    { nome: "Alface Crespa", preco: 14, descricao: "Item principal da barraca 11." },
    { nome: "Tomate", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Cheiro-Verde", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 12
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-12",
  numero: 12,
  nome: "Barraca 12 - Nome do Comércio",
  responsavel: "Responsável 12",
  categoria: "Artesanato",
  descricao: "Peças criativas e itens produzidos à mão.",
  whatsapp: "5543999001212",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f59e0b,#ef4444)",
  pos: { x: 26, y: 96 },
  produtos: [
    { nome: "Chaveiro Artesanal", preco: 16, descricao: "Item principal da barraca 12." },
    { nome: "Vela Aromática", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Peça Decorativa", preco: 14, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 13
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-13",
  numero: 13,
  nome: "Barraca 13 - Nome do Comércio",
  responsavel: "Responsável 13",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999001313",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#06b6d4,#10b981)",
  pos: { x: 74, y: 8 },
  produtos: [
    { nome: "Suco Natural", preco: 10, descricao: "Item principal da barraca 13." },
    { nome: "Refrigerante Lata", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Água Gelada", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 14
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-14",
  numero: 14,
  nome: "Barraca 14 - Nome do Comércio",
  responsavel: "Responsável 14",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999001414",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f97316,#fb7185)",
  pos: { x: 74, y: 16 },
  produtos: [
    { nome: "Pastel de Carne", preco: 12, descricao: "Item principal da barraca 14." },
    { nome: "Pastel de Queijo", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Pastel de Frango", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 15
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-15",
  numero: 15,
  nome: "Barraca 15 - Nome do Comércio",
  responsavel: "Responsável 15",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999001515",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#d97706,#f59e0b)",
  pos: { x: 74, y: 24 },
  produtos: [
    { nome: "Pão Caseiro", preco: 14, descricao: "Item principal da barraca 15." },
    { nome: "Cuca Tradicional", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Biscoito Colonial", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 16
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-16",
  numero: 16,
  nome: "Barraca 16 - Nome do Comércio",
  responsavel: "Responsável 16",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999001616",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#14b8a6,#22c55e)",
  pos: { x: 74, y: 32 },
  produtos: [
    { nome: "Molho de Pimenta", preco: 16, descricao: "Item principal da barraca 16." },
    { nome: "Conserva da Casa", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Tempero Verde", preco: 14, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 17
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-17",
  numero: 17,
  nome: "Barraca 17 - Nome do Comércio",
  responsavel: "Responsável 17",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5543999001717",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#4070f4,#5b87f7)",
  pos: { x: 74, y: 40 },
  produtos: [
    { nome: "X-Salada", preco: 10, descricao: "Item principal da barraca 17." },
    { nome: "Hambúrguer Artesanal", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Batata Frita", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 18
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-18",
  numero: 18,
  nome: "Barraca 18 - Nome do Comércio",
  responsavel: "Responsável 18",
  categoria: "Doces",
  descricao: "Doces caseiros, sobremesas e delícias artesanais.",
  whatsapp: "5543999001818",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#8b5cf6,#ec4899)",
  pos: { x: 74, y: 48 },
  produtos: [
    { nome: "Brigadeiro Gourmet", preco: 12, descricao: "Item principal da barraca 18." },
    { nome: "Bolo no Pote", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Palha Italiana", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 19
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-19",
  numero: 19,
  nome: "Barraca 19 - Nome do Comércio",
  responsavel: "Responsável 19",
  categoria: "Hortifruti",
  descricao: "Verduras, legumes e frutas selecionadas.",
  whatsapp: "5543999001919",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#22c55e,#84cc16)",
  pos: { x: 74, y: 56 },
  produtos: [
    { nome: "Alface Crespa", preco: 14, descricao: "Item principal da barraca 19." },
    { nome: "Tomate", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Cheiro-Verde", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 20
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-20",
  numero: 20,
  nome: "Barraca 20 - Nome do Comércio",
  responsavel: "Responsável 20",
  categoria: "Artesanato",
  descricao: "Peças criativas e itens produzidos à mão.",
  whatsapp: "5543999002020",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f59e0b,#ef4444)",
  pos: { x: 74, y: 64 },
  produtos: [
    { nome: "Chaveiro Artesanal", preco: 16, descricao: "Item principal da barraca 20." },
    { nome: "Vela Aromática", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Peça Decorativa", preco: 14, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 21
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-21",
  numero: 21,
  nome: "Barraca 21 - Nome do Comércio",
  responsavel: "Responsável 21",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999002121",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#06b6d4,#10b981)",
  pos: { x: 74, y: 72 },
  produtos: [
    { nome: "Suco Natural", preco: 10, descricao: "Item principal da barraca 21." },
    { nome: "Refrigerante Lata", preco: 12, descricao: "Outro produto para você ajustar." },
    { nome: "Água Gelada", preco: 8, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 22
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-22",
  numero: 22,
  nome: "Barraca 22 - Nome do Comércio",
  responsavel: "Responsável 22",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999002222",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#f97316,#fb7185)",
  pos: { x: 74, y: 80 },
  produtos: [
    { nome: "Pastel de Carne", preco: 12, descricao: "Item principal da barraca 22." },
    { nome: "Pastel de Queijo", preco: 14, descricao: "Outro produto para você ajustar." },
    { nome: "Pastel de Frango", preco: 10, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 23
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-23",
  numero: 23,
  nome: "Barraca 23 - Nome do Comércio",
  responsavel: "Responsável 23",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999002323",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#d97706,#f59e0b)",
  pos: { x: 74, y: 88 },
  produtos: [
    { nome: "Pão Caseiro", preco: 14, descricao: "Item principal da barraca 23." },
    { nome: "Cuca Tradicional", preco: 16, descricao: "Outro produto para você ajustar." },
    { nome: "Biscoito Colonial", preco: 12, descricao: "Descrição curta do produto." }
  ]
},

/* ===============================
   BARRACA 24
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
   - destaque: selos pequenos do card
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço e descrição
================================= */
{
  id: "barraca-24",
  numero: 24,
  nome: "Barraca 24 - Nome do Comércio",
  responsavel: "Responsável 24",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999002424",
  destaque: ["Feira da Lua", "Pedido online"],
  cover: "linear-gradient(135deg,#14b8a6,#22c55e)",
  pos: { x: 74, y: 96 },
  produtos: [
    { nome: "Molho de Pimenta", preco: 16, descricao: "Item principal da barraca 24." },
    { nome: "Conserva da Casa", preco: 18, descricao: "Outro produto para você ajustar." },
    { nome: "Tempero Verde", preco: 14, descricao: "Descrição curta do produto." }
  ]
}
];

// =============================
// ONDE EDITAR AS BARRACAS:
// 1) Procure por FEIRA_DA_LUA_DATA logo acima
// 2) Cada barraca está em um bloco separado
// 3) Edite nome, responsável, WhatsApp, categoria, posição e produtos
// =============================

const state = {
  search: "",
  category: "",
  view: "cards",
  cart: loadCart()
};

const els = {
  cardsView: document.getElementById("cardsView"),
  mapView: document.getElementById("mapView"),
  mapCanvas: document.getElementById("mapCanvas"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  viewCardsBtn: document.getElementById("viewCardsBtn"),
  viewMapBtn: document.getElementById("viewMapBtn"),
  stallModal: document.getElementById("stallModal"),
  stallModalContent: document.getElementById("stallModalContent"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartContent: document.getElementById("cartContent"),
  cartCount: document.getElementById("cartCount"),
  cartTotalValue: document.getElementById("cartTotalValue"),
  floatingCartBtn: document.getElementById("floatingCartBtn"),
  floatingCartLabel: document.getElementById("floatingCartLabel"),
  openCartBtn: document.getElementById("openCartBtn"),
  clearCartBtn: document.getElementById("clearCartBtn"),
  customerName: document.getElementById("customerName"),
  customerPhone: document.getElementById("customerPhone"),
  customerAddress: document.getElementById("customerAddress"),
  customerNotes: document.getElementById("customerNotes"),
  stallTotal: document.getElementById("stallTotal"),
  productTotal: document.getElementById("productTotal"),
  categoryTotal: document.getElementById("categoryTotal"),
};

init();

function init() {
  populateCategoryFilter();
  loadCustomerData();
  attachEvents();
  renderStats();
  renderAll();
}

function attachEvents() {
  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderAll();
  });

  els.categoryFilter.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderAll();
  });

  els.viewCardsBtn.addEventListener("click", () => setView("cards"));
  els.viewMapBtn.addEventListener("click", () => setView("map"));

  document.querySelectorAll("[data-close-modal]").forEach(btn =>
    btn.addEventListener("click", closeStallModal)
  );

  document.querySelectorAll("[data-close-cart]").forEach(btn =>
    btn.addEventListener("click", closeCart)
  );

  els.openCartBtn.addEventListener("click", openCart);
  els.floatingCartBtn.addEventListener("click", openCart);

  els.clearCartBtn.addEventListener("click", () => {
    if (!state.cart.length) return;
    if (!confirm("Deseja limpar todo o carrinho?")) return;
    state.cart = [];
    persistCart();
    renderCart();
    renderAll();
  });

  [els.customerName, els.customerPhone, els.customerAddress, els.customerNotes].forEach(input => {
    input.addEventListener("input", persistCustomerData);
  });
}

function renderAll() {
  renderCards();
  renderMap();
  renderCart();
}

function renderStats() {
  const categories = [...new Set(FEIRA_DA_LUA_DATA.map(item => item.categoria))];
  const products = FEIRA_DA_LUA_DATA.reduce((acc, stall) => acc + stall.produtos.length, 0);

  els.stallTotal.textContent = FEIRA_DA_LUA_DATA.length;
  els.productTotal.textContent = products;
  els.categoryTotal.textContent = categories.length;
}

function populateCategoryFilter() {
  const categories = [...new Set(FEIRA_DA_LUA_DATA.map(item => item.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
}

function filteredStalls() {
  return FEIRA_DA_LUA_DATA.filter(stall => {
    const matchesCategory = !state.category || stall.categoria === state.category;
    const textBase = [
      stall.nome,
      stall.categoria,
      stall.descricao,
      ...stall.produtos.map(p => `${p.nome} ${p.descricao}`)
    ].join(" ").toLowerCase();

    const matchesSearch = !state.search || textBase.includes(state.search);
    return matchesCategory && matchesSearch;
  });
}

function renderCards() {
  const data = filteredStalls();
  els.cardsView.innerHTML = "";

  if (!data.length) {
    els.cardsView.innerHTML = `<div class="cart-empty" style="grid-column:1/-1">
      Nenhuma barraca encontrada com esse filtro.
    </div>`;
    return;
  }

  const template = document.getElementById("stallCardTemplate");

  data.forEach(stall => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".stall-card");
    const image = node.querySelector(".stall-card__image");
    const categoryChip = node.querySelector(".category-chip");
    const stallName = node.querySelector(".stall-name");
    const productCount = node.querySelector(".product-count");
    const description = node.querySelector(".stall-description");
    const highlights = node.querySelector(".stall-highlights");
    const openBtn = node.querySelector(".btn-open-products");
    const whatsBtn = node.querySelector(".btn-whatsapp");

    image.style.setProperty("--stall-cover", stall.cover);
    categoryChip.textContent = stall.categoria;
    stallName.innerHTML = `<span class="stall-no-badge">Barraca ${String(stall.numero).padStart(2, "0")}</span><div style="height:8px"></div>${stall.nome}`;
    productCount.textContent = `${stall.produtos.length} produto${stall.produtos.length > 1 ? "s" : ""}`;
    description.textContent = stall.descricao;

    stall.destaque.forEach(item => {
      const span = document.createElement("span");
      span.className = "chip chip--outline";
      span.textContent = item;
      highlights.appendChild(span);
    });

    openBtn.addEventListener("click", () => openStallModal(stall.id));

    whatsBtn.href = buildDirectWhatsappLink(stall.whatsapp);
    whatsBtn.addEventListener("click", (e) => {
      if (!stall.whatsapp) e.preventDefault();
    });

    card.dataset.id = stall.id;
    els.cardsView.appendChild(node);
  });
}

function renderMap() {
  els.mapCanvas.innerHTML = "";
  filteredStalls().forEach(stall => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-stall";
    button.style.left = `${stall.pos.x}%`;
    button.style.top = `${stall.pos.y}%`;
    button.style.setProperty("transform", "translate(-50%, -50%)");
    button.innerHTML = `<small>Barraca ${String(stall.numero).padStart(2, "0")}</small><b>${stall.nome}</b><span>${stall.categoria}</span>`;
    button.addEventListener("click", () => openStallModal(stall.id));
    els.mapCanvas.appendChild(button);
  });
}

function setView(view) {
  state.view = view;
  const cards = view === "cards";
  els.viewCardsBtn.classList.toggle("active", cards);
  els.viewMapBtn.classList.toggle("active", !cards);
  els.cardsView.classList.toggle("hidden", !cards);
  els.mapView.classList.toggle("hidden", cards);
}

function openStallModal(stallId) {
  const stall = FEIRA_DA_LUA_DATA.find(item => item.id === stallId);
  if (!stall) return;

  const cartForThisStall = state.cart.filter(item => item.stallId === stallId);

  els.stallModalContent.innerHTML = `
    <div class="stall-modal">
      <div class="stall-modal__top">
        <div class="stall-modal__cover" style="--stall-cover:${stall.cover}"></div>
        <div class="stall-modal__info">
          <span class="chip chip--soft">${stall.categoria}</span>
          <h2>${stall.nome}</h2>
          <p>${stall.descricao}</p>
          <p class="helper-text" style="margin-top:12px;">Responsável: <strong>${stall.responsavel || "-"}</strong></p>
          <div class="inline-list">
            ${stall.destaque.map(item => `<span class="chip chip--outline">${item}</span>`).join("")}
          </div>
          <p class="helper-text" style="margin-top:14px;">
            Escolha os produtos abaixo. O pedido será separado por barraca no final.
          </p>
        </div>
      </div>

      <div class="products-grid">
        ${stall.produtos.map(product => {
          const cartItem = cartForThisStall.find(item => item.productName === product.nome);
          const qty = cartItem ? cartItem.quantity : 0;
          return `
            <article class="product-card">
              <div class="product-card__top">
                <div>
                  <h4>${product.nome}</h4>
                  <p>${product.descricao || ""}</p>
                </div>
              </div>
              <div class="product-card__footer">
                <strong class="price">${formatCurrency(product.preco)}</strong>
                <div class="qty-control">
                  <button class="qty-btn" data-action="minus" data-stall-id="${stall.id}" data-product-name="${escapeAttr(product.nome)}">−</button>
                  <span class="qty-value">${qty}</span>
                  <button class="qty-btn" data-action="plus" data-stall-id="${stall.id}" data-product-name="${escapeAttr(product.nome)}">+</button>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;

  els.stallModal.classList.remove("hidden");
  els.stallModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  els.stallModalContent.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const stallId = btn.dataset.stallId;
      const productName = btn.dataset.productName;
      updateCartItem(stallId, productName, action === "plus" ? 1 : -1);
      openStallModal(stallId);
    });
  });
}

function closeStallModal() {
  els.stallModal.classList.add("hidden");
  els.stallModal.setAttribute("aria-hidden", "true");
  restorePageScroll();
}

function openCart() {
  els.cartDrawer.classList.remove("hidden");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  els.cartDrawer.classList.add("hidden");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  restorePageScroll();
}

function restorePageScroll() {
  const modalOpen = !els.stallModal.classList.contains("hidden");
  const cartOpen = !els.cartDrawer.classList.contains("hidden");
  if (!modalOpen && !cartOpen) {
    document.body.style.overflow = "";
  }
}

function updateCartItem(stallId, productName, delta) {
  const stall = FEIRA_DA_LUA_DATA.find(item => item.id === stallId);
  if (!stall) return;
  const product = stall.produtos.find(item => item.nome === productName);
  if (!product) return;

  const index = state.cart.findIndex(item => item.stallId === stallId && item.productName === productName);

  if (index >= 0) {
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
  } else if (delta > 0) {
    state.cart.push({
      stallId,
      stallName: stall.nome,
      whatsapp: stall.whatsapp,
      productName: product.nome,
      unitPrice: product.preco,
      quantity: 1
    });
  }

  persistCart();
  renderCart();
}

function renderCart() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  els.cartCount.textContent = totalItems;
  els.cartTotalValue.textContent = formatCurrency(totalValue);

  if (totalItems > 0) {
    els.floatingCartBtn.classList.remove("hidden");
    els.floatingCartLabel.textContent = `${totalItems} item${totalItems > 1 ? "s" : ""} no carrinho`;
  } else {
    els.floatingCartBtn.classList.add("hidden");
  }

  if (!state.cart.length) {
    els.cartContent.innerHTML = `
      <div class="cart-empty">
        Seu carrinho está vazio.<br>
        Abra uma barraca e adicione os produtos para enviar o pedido.
      </div>
    `;
    return;
  }

  const grouped = groupCartByStall(state.cart);
  els.cartContent.innerHTML = grouped.map(group => {
    const subtotal = group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const whatsappLink = buildOrderWhatsappLink(group);

    return `
      <section class="cart-stall">
        <div class="cart-stall__header">
          <div>
            <span class="chip chip--soft">Barraca ${String(group.numero || "").padStart(2, "0")} • ${group.category || "Barraca"}</span>
            <h3 style="margin:8px 0 0;">${group.stallName}</h3>
          </div>
          <span class="chip chip--outline">${group.items.length} item${group.items.length > 1 ? "s" : ""}</span>
        </div>

        <div class="cart-items">
          ${group.items.map(item => `
            <div class="cart-item">
              <div class="cart-item__name">
                <strong>${item.productName}</strong>
                <small>${formatCurrency(item.unitPrice)} cada</small>
              </div>
              <div class="qty-control">
                <button class="qty-btn" data-cart-stall-id="${group.stallId}" data-cart-product-name="${escapeAttr(item.productName)}" data-cart-action="minus">−</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" data-cart-stall-id="${group.stallId}" data-cart-product-name="${escapeAttr(item.productName)}" data-cart-action="plus">+</button>
              </div>
              <strong>${formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          `).join("")}
        </div>

        <div class="cart-stall__footer">
          <div class="cart-stall__subtotal">
            <span>Subtotal</span>
            <strong>${formatCurrency(subtotal)}</strong>
          </div>
          <a class="whatsapp-order-btn" href="${whatsappLink}" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp"></i> Enviar pedido para ${group.stallName}
          </a>
        </div>
      </section>
    `;
  }).join("");

  els.cartContent.querySelectorAll("[data-cart-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      updateCartItem(
        btn.dataset.cartStallId,
        btn.dataset.cartProductName,
        btn.dataset.cartAction === "plus" ? 1 : -1
      );
    });
  });
}

function groupCartByStall(cart) {
  const groups = [];
  cart.forEach(item => {
    let group = groups.find(entry => entry.stallId === item.stallId);
    if (!group) {
      const stall = FEIRA_DA_LUA_DATA.find(entry => entry.id === item.stallId);
      group = {
        stallId: item.stallId,
        stallName: item.stallName,
        whatsapp: item.whatsapp,
        category: stall?.categoria || "",
        numero: stall?.numero || "",
        responsavel: stall?.responsavel || "",
        items: []
      };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
}

function buildOrderWhatsappLink(group) {
  const customer = getCustomerData();
  const subtotal = group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const lines = [
    "Olá! Gostaria de fazer este pedido da Feira da Lua:",
    "",
    `Barraca: ${group.stallName}`,
    "",
    ...group.items.map(item => `• ${item.quantity}x ${item.productName} — ${formatCurrency(item.unitPrice * item.quantity)}`),
    "",
    `Subtotal: ${formatCurrency(subtotal)}`,
    "",
    `Responsável: ${group.responsavel || "-"}`,
    `Nome: ${customer.name || "-"}`,
    `Telefone: ${customer.phone || "-"}`,
    `Endereço / referência: ${customer.address || "-"}`,
    `Observação geral: ${customer.notes || "-"}`,
    "",
    "Pedido enviado pela página da Feira da Lua."
  ];

  return `https://wa.me/${onlyDigits(group.whatsapp)}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function buildDirectWhatsappLink(number) {
  const digits = onlyDigits(number);
  return digits ? `https://wa.me/${digits}` : "#";
}

function persistCart() {
  localStorage.setItem("feiraLuaCart", JSON.stringify(state.cart));
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("feiraLuaCart")) || [];
  } catch {
    return [];
  }
}

function persistCustomerData() {
  const data = getCustomerData();
  localStorage.setItem("feiraLuaCustomer", JSON.stringify(data));
}

function loadCustomerData() {
  try {
    const data = JSON.parse(localStorage.getItem("feiraLuaCustomer")) || {};
    els.customerName.value = data.name || "";
    els.customerPhone.value = data.phone || "";
    els.customerAddress.value = data.address || "";
    els.customerNotes.value = data.notes || "";
  } catch {}
}

function getCustomerData() {
  return {
    name: els.customerName.value.trim(),
    phone: els.customerPhone.value.trim(),
    address: els.customerAddress.value.trim(),
    notes: els.customerNotes.value.trim()
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeStallModal();
    closeCart();
  }
});
