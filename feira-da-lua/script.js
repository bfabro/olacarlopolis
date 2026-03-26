const FEIRA_DA_LUA_DATA = [
/* ===============================
   BARRACA 01
   AJUSTE AQUI:
   - nome: nome que aparece para o cliente
   - responsavel: nome do feirante
   - categoria: filtro da página
   - whatsapp: número com DDI/DDD
   - descricao: texto curto da barraca
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-01",
  numero: 1,
  nome: "Indie Burguer",
  responsavel: "Erick Diego",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5511998985930",
  imagemPerfil: "images/indie/perfil.jpg", // coloque aqui a foto ou logo da barraca
  imagemMapa: "images/indie/perfil.jpg", // opcional: se vazio, o mapa usa a imagemPerfil
  chavePix: "39075442858",
  destaque: [],
  cover: "linear-gradient(135deg,#4070f4,#5b87f7)",
  pos: { x: 26, y: 8 },
  produtos: [
    { nome: "Hambúrguer Artesanal Salada", preco: 10, descricao: "Nosso Hamburguer artesanal com uma salada diferenciada", imagem: "images/indie/produtos/1.jpg" },
    { nome: "Hambúrguer Artesanal Bacon", preco: 12, descricao: "Nosso Hambuguer artesanal com muito bacon" , imagem: "images/indie/produtos/2.jpg" },
  
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-02",
  numero: 2,
  nome: "Celeiro",
  responsavel: "Elias",
  categoria: "Espetinho e Chop",
  descricao: "Temos Variedade em espetinhos e Chop Brahma",
  whatsapp: "5511998985930",
  imagemPerfil: "images/celeiro/perfil.jpg", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  chavePix: "39075442858",
  destaque: [],
  cover: "linear-gradient(135deg,#8b5cf6,#ec4899)",
  pos: { x: 26, y: 16 },
  produtos: [
    { nome: "Espetinho de boi", preco: 12, descricao: "Saboroso e artesanal",imagem: "images/celeiro/produtos/1.jpg" },
    {nome: "Kafita", preco: 10, descricao: "Kafita artesanal",imagem: "images/celeiro/produtos/2.jpg" },
    { nome: "Espetinho de Frango", preco: 12, descricao: "Feito com frango caipira",imagem: "images/celeiro/produtos/3.jpg" }
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-03",
  numero: 3,
  nome: "Iwal",
  responsavel: "Rafael",
  categoria: "Comida Japonesa",
  descricao: "Temos Yakisobas e costelinhas",
  whatsapp: "5511998985930",
  imagemPerfil: "images/iwal/perfil.jpg", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  chavePix: "39075442858",
  destaque: [],
  cover: "linear-gradient(135deg,#22c55e,#84cc16)",
  pos: { x: 26, y: 24 },
  produtos: [
    { nome: "Yakisoba", preco: 20, descricao: "Yakisoba tipico japones" ,imagem: "images/iwal/produtos/1.jpg" },
    { nome: "Costelinha com Arroz", preco: 20, descricao: "Costelinha com Arroz", imagem: "images/iwal/produtos/2.jpg"}
 
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-04",
  numero: 4,
  nome: "Seiza",
  responsavel: "Amanda",
  categoria: "Produtos Orientais",
  descricao: "Temos produtos orientais, bolachas, temperos, bebidas",
  whatsapp: "5511998985930",
  imagemPerfil: "images/seiza/perfil.png", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
  cover: "linear-gradient(135deg,#f59e0b,#ef4444)",
  pos: { x: 26, y: 32 },
  produtos: [
    { nome: "Macarrao Instantaneo", preco: 16, descricao: "Macarrao instantaneo, tipo miojo",imagem: "images/seiza/produtos/1.jpg"  },
    { nome: "Temperos", preco: 18, descricao: "Muitas variedades de temperos",imagem: "images/seiza/produtos/2.png" },
    { nome: "Bebidas", preco: 14, descricao: "Temos Sakes, Pingas japonesas",imagem: "images/seiza/produtos/3.png" }
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-05",
  numero: 5,
  nome: "Barraca 05 - Nome do Comércio",
  responsavel: "Responsável 05",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999000505",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-06",
  numero: 6,
  nome: "Barraca 06 - Nome do Comércio",
  responsavel: "Responsável 06",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999000606",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-07",
  numero: 7,
  nome: "Barraca 07 - Nome do Comércio",
  responsavel: "Responsável 07",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999000707",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-08",
  numero: 8,
  nome: "Barraca 08 - Nome do Comércio",
  responsavel: "Responsável 08",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999000808",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-09",
  numero: 9,
  nome: "Barraca 09 - Nome do Comércio",
  responsavel: "Responsável 09",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5543999000909",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-10",
  numero: 10,
  nome: "Barraca 10 - Nome do Comércio",
  responsavel: "Responsável 10",
  categoria: "Doces",
  descricao: "Doces caseiros, sobremesas e delícias artesanais.",
  whatsapp: "5543999001010",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-11",
  numero: 11,
  nome: "Barraca 11 - Nome do Comércio",
  responsavel: "Responsável 11",
  categoria: "Hortifruti",
  descricao: "Verduras, legumes e frutas selecionadas.",
  whatsapp: "5543999001111",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-12",
  numero: 12,
  nome: "Barraca 12 - Nome do Comércio",
  responsavel: "Responsável 12",
  categoria: "Artesanato",
  descricao: "Peças criativas e itens produzidos à mão.",
  whatsapp: "5543999001212",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-13",
  numero: 13,
  nome: "Barraca 13 - Nome do Comércio",
  responsavel: "Responsável 13",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999001313",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-14",
  numero: 14,
  nome: "Barraca 14 - Nome do Comércio",
  responsavel: "Responsável 14",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999001414",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-15",
  numero: 15,
  nome: "Barraca 15 - Nome do Comércio",
  responsavel: "Responsável 15",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999001515",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-16",
  numero: 16,
  nome: "Barraca 16 - Nome do Comércio",
  responsavel: "Responsável 16",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999001616",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-17",
  numero: 17,
  nome: "Barraca 17 - Nome do Comércio",
  responsavel: "Responsável 17",
  categoria: "Lanches",
  descricao: "Pedidos rápidos e lanches feitos na hora.",
  whatsapp: "5543999001717",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-18",
  numero: 18,
  nome: "Barraca 18 - Nome do Comércio",
  responsavel: "Responsável 18",
  categoria: "Doces",
  descricao: "Doces caseiros, sobremesas e delícias artesanais.",
  whatsapp: "5543999001818",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-19",
  numero: 19,
  nome: "Barraca 19 - Nome do Comércio",
  responsavel: "Responsável 19",
  categoria: "Hortifruti",
  descricao: "Verduras, legumes e frutas selecionadas.",
  whatsapp: "5543999001919",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-20",
  numero: 20,
  nome: "Barraca 20 - Nome do Comércio",
  responsavel: "Responsável 20",
  categoria: "Artesanato",
  descricao: "Peças criativas e itens produzidos à mão.",
  whatsapp: "5543999002020",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-21",
  numero: 21,
  nome: "Barraca 21 - Nome do Comércio",
  responsavel: "Responsável 21",
  categoria: "Bebidas",
  descricao: "Bebidas geladas e refrescantes para a feira.",
  whatsapp: "5543999002121",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-22",
  numero: 22,
  nome: "Barraca 22 - Nome do Comércio",
  responsavel: "Responsável 22",
  categoria: "Pastéis",
  descricao: "Pastéis fritos na hora com recheios variados.",
  whatsapp: "5543999002222",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-23",
  numero: 23,
  nome: "Barraca 23 - Nome do Comércio",
  responsavel: "Responsável 23",
  categoria: "Quitandas",
  descricao: "Pães, bolos, cucas e quitandas caseiras.",
  whatsapp: "5543999002323",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
      - imagemPerfil: foto ou logo da barraca no card/modal
   - imagemMapa: opcional; se vazio, usa imagemPerfil no mapa
   - cover: cor/fundo do card
   - pos.x / pos.y: posição da barraca no mapa
   - produtos: troque nome, preço, descrição e imagem
================================= */
{
  id: "barraca-24",
  numero: 24,
  nome: "Barraca 24 - Nome do Comércio",
  responsavel: "Responsável 24",
  categoria: "Temperos",
  descricao: "Molhos, conservas e temperos prontos.",
  whatsapp: "5543999002424",
  imagemPerfil: "", // coloque aqui a foto ou logo da barraca
  imagemMapa: "", // opcional: se vazio, o mapa usa a imagemPerfil
  destaque: [],
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
//
// NOVOS CAMPOS OPCIONAIS EM CADA BARRACA:
// taxaEntregaPadrao: { cidade: 5, fora: 12 }
// taxaPorBairro: { "centro": 5, "novo-horizonte": 8 }
// pix: { chave: "seu-pix-aqui", beneficiario: "Nome Recebedor", cidade: "CARLOPOLIS" }
//
// EXEMPLO PARA COLAR DENTRO DE UMA BARRACA:
// taxaEntregaPadrao: { cidade: 5, fora: 12 },
// taxaPorBairro: { "centro": 5, "zona-rural": 20 },
// pix: {
//   chave: "43999999999",
//   beneficiario: "Barraca 01 - Nome do Comércio",
//   cidade: "CARLOPOLIS"
// }
// =============================

function normalizePixName(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25)
    .toUpperCase() || "FEIRA DA LUA";
}

function normalizePixCity(value) {
  return String(value || "CARLOPOLIS")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15)
    .toUpperCase() || "CARLOPOLIS";
}

function withStallDefaults(stall) {
  return {
    ...stall,
    destaque: Array.isArray(stall.destaque) ? stall.destaque : [],
    produtos: Array.isArray(stall.produtos) ? stall.produtos.map(prod => ({
      ...prod,
      preco: Number(prod.preco) || 0,
      descricao: prod.descricao || "",
      imagem: String(prod.imagem || prod.foto || "").trim()
    })) : [],
    taxaEntregaPadrao: {
      cidade: Number(stall?.taxaEntregaPadrao?.cidade ?? 5) || 0,
      fora: Number(stall?.taxaEntregaPadrao?.fora ?? 12) || 0
    },
    taxaPorBairro: stall.taxaPorBairro || {},
    pix: {
      chave: String(stall?.pix?.chave || stall?.chavePix || "").trim(),
      beneficiario: normalizePixName(stall?.pix?.beneficiario || stall.nome),
      cidade: normalizePixCity(stall?.pix?.cidade || "Carlópolis")
    }
  };
}

const STALLS = FEIRA_DA_LUA_DATA.map(withStallDefaults);

const state = {
  search: "",
  category: "",
  view: "cards",
  cart: loadCart(),
  orderForms: loadOrderForms()
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
  stallTotal: document.getElementById("stallTotal"),
  productTotal: document.getElementById("productTotal"),
  categoryTotal: document.getElementById("categoryTotal"),
  pixModal: document.getElementById("pixModal"),
  pixModalTitle: document.getElementById("pixModalTitle"),
  pixChaveShow: document.getElementById("pixChaveShow"),
  pixCopiaCola: document.getElementById("pixCopiaCola"),
  pixQr: document.getElementById("pixQr"),
  btnCopyPixKey: document.getElementById("btnCopyPixKey"),
  btnCopyPixCode: document.getElementById("btnCopyPixCode"),
  imageViewerModal: document.getElementById("imageViewerModal"),
  imageViewerImg: document.getElementById("imageViewerImg"),
  imageViewerCaption: document.getElementById("imageViewerCaption")
};

init();

function hydrateOrderFormsWithFairMemory() {
  const memory = loadCustomerMemory();
  const sharedFields = getSharedOrderFields();

  Object.keys(state.orderForms).forEach((stallId) => {
    const form = state.orderForms[stallId] || defaultOrderForm(stallId, false);
    sharedFields.forEach((field) => {
      if (field === "lembrar") {
        form[field] = typeof memory.lembrar === "boolean" ? memory.lembrar : (typeof form[field] === "boolean" ? form[field] : true);
        return;
      }
      if (memory[field] !== undefined && memory[field] !== null && memory[field] !== "") {
        form[field] = memory[field];
      }
    });
    state.orderForms[stallId] = form;
  });
}

function init() {
  hydrateOrderFormsWithFairMemory();
  populateCategoryFilter();
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

  document.querySelectorAll("[data-close-pix]").forEach(btn =>
    btn.addEventListener("click", closePixModal)
  );

  document.querySelectorAll("[data-close-image-viewer]").forEach(btn =>
    btn.addEventListener("click", closeImageViewer)
  );

  if (els.imageViewerModal) {
    els.imageViewerModal.addEventListener("click", (e) => {
      if (e.target === els.imageViewerModal) closeImageViewer();
    });
  }

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

  els.cartContent.addEventListener("click", onCartClick);
  els.cartContent.addEventListener("input", onCartInput);
  els.cartContent.addEventListener("change", onCartChange);

  els.btnCopyPixKey?.addEventListener("click", () => copyText(els.pixChaveShow.value));
  els.btnCopyPixCode?.addEventListener("click", () => copyText(els.pixCopiaCola.value));

  if (els.pixModal) {
    els.pixModal.addEventListener("click", (e) => {
      const rect = els.pixModal.getBoundingClientRect();
      const clickedOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      if (clickedOutside) closePixModal();
    });
  }
}

function renderAll() {
  renderCards();
  renderMap();
  renderCart();
}

function renderStats() {
  const categories = [...new Set(STALLS.map(item => item.categoria))];
  const products = STALLS.reduce((acc, stall) => acc + stall.produtos.length, 0);

  els.stallTotal.textContent = STALLS.length;
  els.productTotal.textContent = products;
  els.categoryTotal.textContent = categories.length;
}

function populateCategoryFilter() {
  const categories = [...new Set(STALLS.map(item => item.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
}

function filteredStalls() {
  return STALLS.filter(stall => {
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


function getInitials(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || "")
    .join("") || "FL";
}

function getStallImage(stall, useMap = false) {
  if (useMap) return stall.imagemMapa || stall.imagemPerfil || "";
  return stall.imagemPerfil || stall.imagemMapa || "";
}

function buildAvatarMarkup(stall, variant = "card") {
  const useMap = variant === "map";
  const imageUrl = getStallImage(stall, useMap);
  const initials = getInitials(stall.nome);
  const alt = `Imagem da ${stall.nome}`;
  const classes = `stall-avatar stall-avatar--${variant}${imageUrl ? "" : " is-fallback"}`;

  return `
    <div class="${classes}" style="--stall-cover:${stall.cover}">
      ${imageUrl ? `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove()">` : ""}
      <div class="stall-avatar__fallback">
        <i class="fa-solid fa-store"></i>
        <span>${escapeHtml(initials)}</span>
      </div>
    </div>
  `;
}

function buildProductImageMarkup(product, stall) {
  const imageUrl = String(product?.imagem || "").trim();
  const alt = `Imagem do produto ${product?.nome || ""}`;

  if (!imageUrl) {
    return `
      <div class="product-card__thumb is-fallback" style="--stall-cover:${stall.cover}">
        <div class="product-card__thumb-fallback">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>${escapeHtml(product?.nome || "Produto")}</span>
        </div>
      </div>
    `;
  }

  return `
    <button
      type="button"
      class="product-card__thumb js-open-product-image"
      data-image="${escapeAttr(imageUrl)}"
      data-caption="${escapeAttr(product?.nome || "Produto")}">
      <img src="${imageUrl}" alt="${alt}" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove()">
      <span class="product-card__thumb-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
      <div class="product-card__thumb-fallback">
        <i class="fa-solid fa-bag-shopping"></i>
        <span>${escapeHtml(product?.nome || "Produto")}</span>
      </div>
    </button>
  `;
}

function openImageViewer(src, caption = "") {
  if (!els.imageViewerModal || !els.imageViewerImg) return;
  els.imageViewerImg.src = src;
  els.imageViewerImg.alt = caption || "Imagem ampliada";
  if (els.imageViewerCaption) {
    els.imageViewerCaption.textContent = caption || "";
  }
  els.imageViewerModal.showModal();
}

function closeImageViewer() {
  if (!els.imageViewerModal) return;
  els.imageViewerModal.close();
  if (els.imageViewerImg) {
    els.imageViewerImg.src = "";
    els.imageViewerImg.alt = "Imagem ampliada";
  }
  if (els.imageViewerCaption) {
    els.imageViewerCaption.textContent = "";
  }
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
    image.classList.toggle("is-fallback", !getStallImage(stall));
    image.innerHTML = `
      ${getStallImage(stall) ? `<img class="stall-card__hero" src="${getStallImage(stall)}" alt="Imagem da ${stall.nome}" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove()">` : ""}
      <div class="stall-card__image-bg"></div>
      ${buildAvatarMarkup(stall, "card")}
      <span class="stall-card__number">Barraca ${String(stall.numero).padStart(2, "0")}</span>
    `;
    categoryChip.textContent = stall.categoria;
    stallName.innerHTML = `<div style="height:8px"></div>${stall.nome}`;
    productCount.textContent = `${stall.produtos.length} produto${stall.produtos.length > 1 ? "s" : ""}`;
    description.textContent = stall.descricao;

    if (Array.isArray(stall.destaque) && stall.destaque.length) {
      stall.destaque.forEach(item => {
        const span = document.createElement("span");
        span.className = "chip chip--outline";
        span.textContent = item;
        highlights.appendChild(span);
      });
    }

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

  const data = filteredStalls().slice().sort((a, b) => {
    if (a.pos.x !== b.pos.x) return a.pos.x - b.pos.x;
    return a.pos.y - b.pos.y;
  });

  if (!data.length) {
    els.mapCanvas.innerHTML = `<div class="cart-empty map-empty">Nenhuma barraca encontrada com esse filtro.</div>`;
    return;
  }

  const leftLane = document.createElement("div");
  leftLane.className = "map-lane map-lane--left";

  const rightLane = document.createElement("div");
  rightLane.className = "map-lane map-lane--right";

  data.forEach(stall => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-stall";
    button.innerHTML = `
      <small class="map-stall__number">Barraca ${String(stall.numero).padStart(2, "0")}</small>
      <div class="map-stall__avatar-wrap">
        ${buildAvatarMarkup(stall, "map")}
      </div>
      <b class="map-stall__name">${stall.nome}</b>
      <span class="map-stall__category">${stall.categoria}</span>
    `;
    button.addEventListener("click", () => openStallModal(stall.id));

    if (stall.pos.x < 50) {
      leftLane.appendChild(button);
    } else {
      rightLane.appendChild(button);
    }
  });

  els.mapCanvas.appendChild(leftLane);
  els.mapCanvas.appendChild(rightLane);
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
  const stall = getStallById(stallId);
  if (!stall) return;

  const cartForThisStall = state.cart.filter(item => item.stallId === stallId);
  const totalItems = cartForThisStall.reduce((sum, item) => sum + item.quantity, 0);
  const heroImage = getStallImage(stall);

  els.stallModalContent.innerHTML = `
    <div class="stall-modal">
      <div class="stall-modal__top">
        <div class="stall-modal__cover ${heroImage ? "" : "is-fallback"}" style="--stall-cover:${stall.cover}">
          ${heroImage ? `<img class="stall-modal__hero" src="${heroImage}" alt="Imagem da ${stall.nome}" loading="lazy" onerror="this.parentElement.classList.add('is-fallback'); this.remove()">` : ""}
          <div class="stall-modal__cover-bg"></div>
          <div class="stall-modal__cover-fallback">
            <i class="fa-solid fa-store"></i>
            <span>${getInitials(stall.nome)}</span>
          </div>
          <span class="stall-modal__number">Barraca ${String(stall.numero).padStart(2, "0")}</span>
        </div>
        <div class="stall-modal__info">
          <div class="stall-modal__identity">
            <div class="stall-modal__identity-text">
              <span class="chip chip--soft">${stall.categoria}</span>
              <h2>${stall.nome}</h2>
              <p class="helper-text">Responsável: <strong>${stall.responsavel || "-"}</strong></p>
            </div>
          </div>
          <p>${stall.descricao}</p>
          <button type="button" class="stall-modal__floating-close" id="backToStallsBtn" aria-label="Fechar e voltar para barracas">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <p class="helper-text" style="margin-top:14px;">
            Escolha os produtos abaixo. 
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
                ${buildProductImageMarkup(product, stall)}
                <div class="product-card__text">
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

      ${totalItems > 0 ? `
        <div class="modal-order-next">
          <div>
            <strong>${totalItems} item${totalItems > 1 ? "s" : ""} desta barraca no carrinho</strong>
           
          </div>
          <button type="button" class="primary-btn" id="goToOrderBtn">
            <i class="fa-solid fa-arrow-right"></i> Continuar pedido
          </button>
        </div>
      ` : ""}
    </div>
  `;

  els.stallModal.classList.remove("hidden");
  els.stallModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  els.stallModalContent.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.stallId;
      const productName = btn.dataset.productName;
      updateCartItem(id, productName, action === "plus" ? 1 : -1);
      openStallModal(id);
    });
  });

  els.stallModalContent.querySelectorAll(".js-open-product-image").forEach(btn => {
    btn.addEventListener("click", () => {
      const src = btn.dataset.image;
      const caption = btn.dataset.caption || "";
      if (src) openImageViewer(src, caption);
    });
  });

  const backBtn = document.getElementById("backToStallsBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      closeStallModal();
      setView("cards");
      requestAnimationFrame(() => {
        document.getElementById("cardsView")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  const goBtn = document.getElementById("goToOrderBtn");
  if (goBtn) {
    goBtn.addEventListener("click", () => {
      closeStallModal();
      openCart();
      requestAnimationFrame(() => {
        document.querySelector(`[data-order-group="${stallId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
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

function closePixModal() {
  if (typeof els.pixModal?.close === "function" && els.pixModal.open) {
    els.pixModal.close();
  }
  restorePageScroll();
}

function restorePageScroll() {
  const modalOpen = !els.stallModal.classList.contains("hidden");
  const cartOpen = !els.cartDrawer.classList.contains("hidden");
  const pixOpen = !!els.pixModal?.open;
  if (!modalOpen && !cartOpen && !pixOpen) {
    document.body.style.overflow = "";
  }
}

function updateCartItem(stallId, productName, delta) {
  const stall = getStallById(stallId);
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
        Abra uma barraca e adicione os produtos para preencher entrega, WhatsApp e PIX de cada barraca.
      </div>
    `;
    return;
  }

  const grouped = groupCartByStall(state.cart);
  els.cartContent.innerHTML = grouped.map(group => renderCartGroup(group)).join("");

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

function renderCartGroup(group) {
  const stall = getStallById(group.stallId);
  const form = getOrderForm(group.stallId);
  const delivery = calculateDelivery(stall, form);
  const totals = calculateGroupTotals(group.items, delivery.fee);
  const pickup = form.tipoPedido === "Retirada";
  const canSend = canSendOrder(group.items, form);
  const canPix = Boolean(stall.pix?.chave);

  return `
    <section class="cart-stall cart-stall--order" data-order-group="${group.stallId}">
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

      <div class="order-layout">
        <div class="order-card-block order-card-block--delivery">
          <div class="order-card-block__title">
            <i class="fa-solid fa-truck-fast"></i>
            <span>Dados para Entrega / Retirada</span>
          </div>

          <div class="order-grid order-grid--2">
            <label class="order-field">
              <span>Como você quer receber?</span>
              <select data-stall-id="${group.stallId}" data-stall-field="tipoPedido">
                <option value="Entrega" ${form.tipoPedido === "Entrega" ? "selected" : ""}>Entrega</option>
                <option value="Retirada" ${form.tipoPedido === "Retirada" ? "selected" : ""}>Retirada</option>
              </select>
            </label>

            <label class="order-field ${pickup ? "hidden" : ""}">
              <span>Zona da entrega</span>
              <select data-stall-id="${group.stallId}" data-stall-field="zonaEntrega">
                <option value="cidade" ${form.zonaEntrega === "cidade" ? "selected" : ""}>Dentro da cidade</option>
                <option value="fora" ${form.zonaEntrega === "fora" ? "selected" : ""}>Fora da cidade</option>
              </select>
            </label>

            <label class="order-field ${pickup ? "hidden full" : ""}">
              <span>Bairro</span>
              <input type="text" value="${escapeHtml(form.bairro)}" placeholder="Digite seu bairro" data-stall-id="${group.stallId}" data-stall-field="bairro" />
            </label>

            <label class="order-field ${pickup ? "hidden" : ""}">
              <span>Endereço</span>
              <input type="text" value="${escapeHtml(form.endereco)}" placeholder="Rua, avenida..." data-stall-id="${group.stallId}" data-stall-field="endereco" />
            </label>

            <label class="order-field ${pickup ? "hidden" : ""}">
              <span>Número</span>
              <input type="text" value="${escapeHtml(form.numeroEndereco)}" placeholder="Nº" data-stall-id="${group.stallId}" data-stall-field="numeroEndereco" />
            </label>

            <label class="order-field full ${pickup ? "hidden" : ""}">
              <span>Referência (opcional)</span>
              <input type="text" value="${escapeHtml(form.referencia)}" placeholder="Portaria, ponto de referência..." data-stall-id="${group.stallId}" data-stall-field="referencia" />
            </label>
          </div>
        </div>

        <div class="order-card-block order-card-block--customer">
          <div class="order-card-block__title">
            <i class="fa-solid fa-user"></i>
            <span>Contato e Pagamento</span>
          </div>

          <div class="order-grid order-grid--2">
            <label class="order-field">
              <span>Seu nome</span>
              <input type="text" value="${escapeHtml(form.nome)}" placeholder="Seu nome" data-stall-id="${group.stallId}" data-stall-field="nome" />
            </label>

            <label class="order-field">
              <span>Seu telefone</span>
              <input type="tel" value="${escapeHtml(form.telefone)}" placeholder="(43) 9xxxx-xxxx" data-stall-id="${group.stallId}" data-stall-field="telefone" />
            </label>

            <label class="order-field">
              <span>Forma de pagamento</span>
              <select data-stall-id="${group.stallId}" data-stall-field="pagamento">
                <option value="PIX" ${form.pagamento === "PIX" ? "selected" : ""}>PIX</option>
                <option value="Dinheiro" ${form.pagamento === "Dinheiro" ? "selected" : ""}>Dinheiro</option>
                <option value="Cartão" ${form.pagamento === "Cartão" ? "selected" : ""}>Cartão</option>
              </select>
            </label>

            <label class="order-field full">
              <span>Observações</span>
              <textarea rows="3" placeholder="Ex.: retirar sem cebola / entregar às 19h" data-stall-id="${group.stallId}" data-stall-field="obs">${escapeHtml(form.obs)}</textarea>
            </label>
          </div>

          <div class="remember-row">
            <label class="remember-check">
              <input type="checkbox" ${form.lembrar ? "checked" : ""} data-stall-id="${group.stallId}" data-stall-field="lembrar" />
              <span>Lembrar meus dados para toda a feira</span>
            </label>
            <button type="button" class="ghost-btn remember-clear-btn" data-clear-order="${group.stallId}">
              <i class="fa-regular fa-trash-can"></i> Limpar dados da feira
            </button>
          </div>
        </div>
      </div>

      <div class="cart-stall__footer cart-stall__footer--order">
        <div class="totals-panel">
          <div><span>Subtotal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
          <div><span>${delivery.label}</span><strong>${formatCurrency(delivery.fee)}</strong></div>
          <div class="totals-panel__total"><span>Total</span><strong>${formatCurrency(totals.total)}</strong></div>
        </div>

        <div class="order-actions">
          <button type="button" class="whatsapp-order-btn ${canSend ? "" : "is-disabled"}" data-send-order="${group.stallId}">
            <i class="fa-brands fa-whatsapp"></i> Enviar pedido
          </button>
          <button type="button" class="pix-order-btn ${canPix ? "" : "is-disabled"}" data-open-pix="${group.stallId}">
            <i class="fa-solid fa-qrcode"></i> Gerar PIX
          </button>
        </div>
      </div>
    </section>
  `;
}

function onCartClick(e) {
  const clearBtn = e.target.closest("[data-clear-order]");
  if (clearBtn) {
    const stallId = clearBtn.dataset.clearOrder;
    if (!confirm("Deseja limpar os dados salvos da feira toda?")) return;
    clearCustomerMemory();
    resetAllOrderForms();
    renderCart();
    return;
  }

  const sendBtn = e.target.closest("[data-send-order]");
  if (sendBtn) {
    const stallId = sendBtn.dataset.sendOrder;
    syncOrderFormFromDom(stallId);
    const group = groupCartByStall(state.cart).find(item => item.stallId === stallId);
    const stall = getStallById(stallId);
    const form = getOrderForm(stallId);

    if (!group || !stall) return;
    if (!canSendOrder(group.items, form)) {
      alert("Preencha pelo menos nome e telefone. Se for entrega, informe também o endereço.");
      return;
    }

    const text = buildOrderMessage(stall, group, form);
    const url = `https://wa.me/${onlyDigits(stall.whatsapp)}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
    return;
  }

  const pixBtn = e.target.closest("[data-open-pix]");
  if (pixBtn) {
    const stallId = pixBtn.dataset.openPix;
    syncOrderFormFromDom(stallId);
    const group = groupCartByStall(state.cart).find(item => item.stallId === stallId);
    const stall = getStallById(stallId);
    if (!group || !stall) return;
    if (!stall.pix?.chave) {
      alert("Configure a chave PIX desta barraca no script.js antes de usar.");
      return;
    }
    const form = getOrderForm(stallId);
    const delivery = calculateDelivery(stall, form);
    const totals = calculateGroupTotals(group.items, delivery.fee);
    openPixModal(stall, totals.total);
  }
}

function onCartInput(e) {
  const field = e.target?.dataset?.stallField;
  const stallId = e.target?.dataset?.stallId;
  if (!field || !stallId) return;
  const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  updateOrderField(stallId, field, value);
}

function onCartChange(e) {
  const field = e.target?.dataset?.stallField;
  const stallId = e.target?.dataset?.stallId;
  if (!field || !stallId) return;
  const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  updateOrderField(stallId, field, value);

  if (["tipoPedido", "zonaEntrega", "bairro"].includes(field)) {
    renderCart();
  }
}

function groupCartByStall(cart) {
  const groups = [];
  cart.forEach(item => {
    let group = groups.find(entry => entry.stallId === item.stallId);
    if (!group) {
      const stall = getStallById(item.stallId);
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

function getStallById(stallId) {
  return STALLS.find(item => item.id === stallId);
}

function defaultOrderForm(stallId, useMemory = true) {
  const memory = useMemory ? loadCustomerMemory() : {};
  return {
    tipoPedido: memory.tipoPedido || "Entrega",
    zonaEntrega: memory.zonaEntrega || "cidade",
    bairro: memory.bairro || "",
    endereco: memory.endereco || "",
    numeroEndereco: memory.numeroEndereco || "",
    referencia: memory.referencia || "",
    nome: memory.nome || "",
    telefone: memory.telefone || "",
    pagamento: memory.pagamento || "PIX",
    obs: "",
    lembrar: typeof memory.lembrar === "boolean" ? memory.lembrar : true
  };
}

function getOrderForm(stallId) {
  if (!state.orderForms[stallId]) {
    state.orderForms[stallId] = defaultOrderForm(stallId);
  }
  return state.orderForms[stallId];
}

function getSharedOrderFields() {
  return [
    "tipoPedido",
    "zonaEntrega",
    "bairro",
    "endereco",
    "numeroEndereco",
    "referencia",
    "nome",
    "telefone",
    "pagamento",
    "lembrar"
  ];
}

function isSharedOrderField(field) {
  return getSharedOrderFields().includes(field);
}

function updateOrderField(stallId, field, value) {
  const form = getOrderForm(stallId);
  form[field] = value;

  if (isSharedOrderField(field)) {
    syncSharedFieldAcrossFair(stallId, field, value);
    syncSharedFieldInputsInCart(stallId, field, value);
  }

  persistSingleOrderForm(stallId);
}

function syncSharedFieldAcrossFair(sourceStallId, field, value) {
  Object.keys(state.orderForms).forEach((currentStallId) => {
    if (currentStallId === sourceStallId) return;
    const currentForm = getOrderForm(currentStallId);
    currentForm[field] = value;
  });
}

function syncSharedFieldInputsInCart(sourceStallId, field, value) {
  if (!els.cartContent) return;
  els.cartContent.querySelectorAll(`[data-stall-field="${field}"]`).forEach((input) => {
    const currentStallId = input.dataset.stallId;
    if (currentStallId === sourceStallId) return;
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value;
    }
  });
}

function resetAllOrderForms() {
  const stallIds = Object.keys(state.orderForms);
  if (!stallIds.length) {
    STALLS.forEach((stall) => {
      state.orderForms[stall.id] = defaultOrderForm(stall.id, false);
    });
  } else {
    stallIds.forEach((stallId) => {
      state.orderForms[stallId] = defaultOrderForm(stallId, false);
    });
  }
  persistOrderForms();
}

function calculateDelivery(stall, form) {
  if (form.tipoPedido === "Retirada") {
    return { fee: 0, label: "Retirada na barraca" };
  }

  const key = slugify(form.bairro || "");
  if (key && Object.prototype.hasOwnProperty.call(stall.taxaPorBairro, key)) {
    return { fee: Number(stall.taxaPorBairro[key]) || 0, label: `Taxa (${form.bairro})` };
  }

  const zone = form.zonaEntrega === "fora" ? "fora" : "cidade";
  return {
    fee: Number(stall.taxaEntregaPadrao?.[zone]) || 0,
    label: zone === "fora" ? "Taxa (Fora da cidade)" : "Taxa (Dentro da cidade)"
  };
}

function calculateGroupTotals(items, deliveryFee = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + Number(deliveryFee || 0);
  return { subtotal, total };
}

function canSendOrder(items, form) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasName = Boolean((form.nome || "").trim());
  const hasPhone = Boolean(onlyDigits(form.telefone).length >= 10);
  if (!hasItems || !hasName || !hasPhone) return false;
  if (form.tipoPedido === "Entrega") {
    return Boolean((form.endereco || "").trim() && (form.numeroEndereco || "").trim());
  }
  return true;
}

function buildOrderMessage(stall, group, form) {
  const delivery = calculateDelivery(stall, form);
  const totals = calculateGroupTotals(group.items, delivery.fee);
  const orderNumber = generateOrderNumber();
  const now = new Date();

  const lines = [
  "🛒 *NOVO PEDIDO - FEIRA DA LUA*",
  "━━━━━━━━━━━━━━",
  "",
  `Pedido: ${orderNumber}`,
  `Barraca: ${stall.nome}`,
  `Responsável: ${stall.responsavel || "-"}`,
  `Data: ${now.toLocaleDateString("pt-BR")}`,
  `Horário: ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
  "",
  "━━━━━━━━━━━━━━",
  "*ITENS DO PEDIDO*",
  "━━━━━━━━━━━━━━",
  ...group.items.map(item => `• ${item.quantity}x ${item.productName} — ${formatCurrency(item.unitPrice * item.quantity)}`),
  "",
  "━━━━━━━━━━━━━━",
  "*VALORES*",
  "━━━━━━━━━━━━━━",
  `Subtotal: ${formatCurrency(totals.subtotal)}`,
  `${delivery.label}: ${formatCurrency(delivery.fee)}`,
  `Total: ${formatCurrency(totals.total)}`,
  "",
  "━━━━━━━━━━━━━━",
  "*DADOS DO CLIENTE*",
  "━━━━━━━━━━━━━━",
  `Tipo do pedido: ${form.tipoPedido}`,
  `Pagamento: ${form.pagamento}`,
  form.tipoPedido === "Entrega"
    ? `Entrega em: ${[form.endereco, "Nº " + form.numeroEndereco, form.bairro].filter(Boolean).join(" • ")}`
    : "Retirada: Cliente vai retirar na barraca",
  form.tipoPedido === "Entrega" && form.referencia ? `Referência: ${form.referencia}` : null,
  `Nome: ${form.nome || "-"}`,
  `Telefone: ${form.telefone || "-"}`,
  form.obs ? `Observações: ${form.obs}` : null,
  "",
  "━━━━━━━━━━━━━━",
  "Pedido enviado pela página da Feira da Lua."
].filter(Boolean);

  return lines.join("\n");
}

function generateOrderNumber() {
  const KEY = "feira_lua_numero_pedido_seq";
  let seq = Number(localStorage.getItem(KEY) || "0") + 1;
  localStorage.setItem(KEY, String(seq));
  return `FL_${String(seq).padStart(6, "0")}`;
}

function buildDirectWhatsappLink(number) {
  const digits = onlyDigits(number);
  return digits ? `https://wa.me/${digits}` : "#";
}

function openPixModal(stall, total) {
  const pixConfig = stall.pix || {};
  const chave = (pixConfig.chave || "").trim();
  if (!chave) return;

  els.pixModalTitle.textContent = `PIX • ${stall.nome}`;
  els.pixChaveShow.value = chave;

  const txid = generateOrderNumber().replace("FL_", "PX");
  const code = buildPixCopiaCola({
    valor: total,
    txid,
    chavePix: chave,
    descricao: stall.nome,
    nome: pixConfig.beneficiario,
    cidade: pixConfig.cidade
  });

  if (els.pixQr) {
    els.pixQr.innerHTML = "";
    if (typeof QRCode !== "undefined") {
      new QRCode(els.pixQr, { text: code, width: 190, height: 190 });
    } else {
      els.pixQr.innerHTML = "<p style='margin:0;color:#5a6f86'>QR Code indisponível.</p>";
    }
  }

  els.pixCopiaCola.value = code;
  if (typeof els.pixModal?.showModal === "function") {
    els.pixModal.showModal();
    document.body.style.overflow = "hidden";
  }
}

function emv(id, value) {
  const text = String(value ?? "");
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixCopiaCola({ valor, txid, chavePix, descricao, nome, cidade }) {
  const gui = emv("00", "br.gov.bcb.pix");
  const key = emv("01", String(chavePix).trim());
  const desc = descricao ? emv("02", String(descricao).slice(0, 72)) : "";
  const merAcc = emv("26", gui + key + desc);
  const pfi = "000201";
  const pInit = emv("01", "11");
  const mcc = emv("52", "0000");
  const moeda = emv("53", "986");
  const val = emv("54", Number(valor).toFixed(2));
  const pais = emv("58", "BR");
  const nm = emv("59", normalizePixName(nome));
  const cid = emv("60", normalizePixCity(cidade));
  const txidF = emv("05", String(txid || "***").slice(0, 25));
  const add = emv("62", txidF);

  let payload = pfi + pInit + merAcc + mcc + moeda + val + pais + nm + cid + add;
  payload += "6304";
  return payload + crc16(payload);
}

function syncOrderFormFromDom(stallId) {
  const scope = els.cartContent.querySelector(`[data-order-group="${stallId}"]`);
  if (!scope) return getOrderForm(stallId);

  scope.querySelectorAll("[data-stall-field]").forEach(field => {
    const name = field.dataset.stallField;
    const value = field.type === "checkbox" ? field.checked : field.value;
    updateOrderField(stallId, name, value);
  });

  return getOrderForm(stallId);
}

function persistSingleOrderForm(stallId) {
  const form = getOrderForm(stallId);
  if (form.lembrar) {
    saveCustomerMemory(form);
  } else {
    clearCustomerMemory();
  }
  persistOrderForms();
}

function persistOrderForms() {
  localStorage.setItem("feiraLuaOrderForms", JSON.stringify(state.orderForms));
}

function loadOrderForms() {
  try {
    const raw = JSON.parse(localStorage.getItem("feiraLuaOrderForms")) || {};
    return raw;
  } catch {
    return {};
  }
}

function saveCustomerMemory(form) {
  const payload = {
    tipoPedido: form.tipoPedido || "Entrega",
    zonaEntrega: form.zonaEntrega || "cidade",
    nome: form.nome || "",
    telefone: form.telefone || "",
    bairro: form.bairro || "",
    endereco: form.endereco || "",
    numeroEndereco: form.numeroEndereco || "",
    referencia: form.referencia || "",
    pagamento: form.pagamento || "PIX",
    lembrar: Boolean(form.lembrar)
  };
  localStorage.setItem("feiraLuaCustomerMemory", JSON.stringify(payload));
}

function loadCustomerMemory() {
  try {
    return JSON.parse(localStorage.getItem("feiraLuaCustomerMemory")) || {};
  } catch {
    return {};
  }
}

function clearCustomerMemory() {
  localStorage.removeItem("feiraLuaCustomerMemory");
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

function slugify(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function copyText(text) {
  const value = String(text || "").trim();
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const tmp = document.createElement("textarea");
    tmp.value = value;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy");
    tmp.remove();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeStallModal();
    closeCart();
    closePixModal();
  }
});
