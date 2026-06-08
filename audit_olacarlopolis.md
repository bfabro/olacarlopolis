# Auditoria Rápida — Olá Carlópolis
Data: 2025-08-15 02:38:56

## Estrutura detectada
- Root files: index.html, style.css, script.js, manifest.json, service-worker.js, sitemap.xml, robots.txt
- Extra pages: rc.html, sr.html
- (Imagens não incluídas no ZIP, conforme informado)


## Tamanho dos arquivos-chave
- **index.html**: 1626 linhas (~79 KB)
- **style.css**: 3269 linhas (~60 KB)
- **script.js**: 10106 linhas (~379 KB)
- **manifest.json**: 22 linhas (~0.5 KB)
- **service-worker.js**: 28 linhas (~0.6 KB)

## Sinais rápidos (script.js)
- Firebase?: Sim (detecção em script.js)
- Abas/Tabs?: Sim (strings relacionadas)
- Promoções?: Não evidente por busca rápida
- Gerar Card?: Não evidente por busca rápida

---

## Pontos fortes iniciais
- ✅ PWA básico presente (manifest + service-worker).
- ✅ Sitemap e robots já configurados (SEO técnico inicial).
- ✅ Single Page base (`index.html`) com CSS/JS centralizados — facilita padronização.
- ✅ Uso de Firebase indica caminho para dados dinâmicos.

## Riscos / Gargalos que vi de cara
1. **`script.js` muito grande (~10k linhas)**  
   - Dificulta manutenção e aumenta tempo de carregamento.  
   - Sugestão: modularizar por features (ex.: abas, cards, promoções, firebase, utilitários).
2. **CSS extenso (3k+ linhas)**  
   - Provável CSS não utilizado (sem imagens não dá pra confirmar).  
   - Sugestão: varrer classes no HTML/JS e extrair componentes (cards, botões, abas).
3. **Acessibilidade & UX**  
   - Conferir foco/teclado nas abas (Info/Fotos/Cardápio).  
   - Ícones e botões com `aria-label`/`title` e tamanho de toque.
4. **Desempenho**  
   - Checar `defer`/`async` no JS, divisão por rotas/abas, lazy-loading de imagens (quando enviadas).  
   - Minificação/Compressão (build simples).
5. **Dados e métricas**  
   - Estrutura de eventos (cliques por menu, promoções, usuários únicos) não vista de imediato no `script.js`.  
   - Sugestão: padronizar um `analytics.js` com funções de log.
6. **Separação de conteúdo**  
   - `index.html` longo (1600+ linhas) — avaliar templating (partials) ou componentes JS para evitar repetição.
7. **PWA**  
   - Verificar cache strategy no `service-worker.js` (stale-while-revalidate para HTML/CSS/JS e cache-first para assets).

## Itens que você já pediu e como encaixar (sem imagens por ora)
- **Card “Vaga de Trabalho”** espelhando o card de **Plantão**.
- Campo **“Pré-requisitos”** dentro do card de Vagas.
- **Botões Info/Fotos/Cardápio** como abas com comportamento acessível e responsivo.
- **Botão WhatsApp/Telefone** estilizado (sem cor de link), com DDI 55 normalizado.
- **Ícone no “Cardápio”** (garfo/colarheres) via Font Awesome ou SVG inline.
- **Página de Promoções** com cards horizontais e contador de acessos.
- **“Gerar Card”** (export da seção visível) — planejar com `html2canvas` quando imagens estiverem presentes.

## Plano de Modularização Proposto
```
/js/
  core/
    dom.js           # helpers de DOM
    utils.js         # normalizações (telefone, datas, etc.)
  ui/
    tabs.js          # controle das abas Info/Fotos/Cardápio
    cards.js         # componentes de card (Plantão, Vaga, Promo)
    modal.js         # (se houver)
  data/
    firebase.js      # init e CRUD
    analytics.js     # logs de clique/usuários
  features/
    vagas.js
    plantao.js
    promocoes.js
    geradorCard.js
main.js              # bootstrap: init, bind geral
```
- `index.html` chama módulos com `type="module"` e `defer`.
- CSS separado por componentes (cards, buttons, layout).

## Próximos passos sugeridos (sem precisar das imagens ainda)
1. **Entregar Patch 01**  
   - Criar estrutura `/js/` modular.  
   - Migrar abas (Info/Fotos/Cardápio) para `ui/tabs.js`.  
   - Criar `ui/cards.js` com **Card Plantão** e **Card Vaga** (com Pré-requisitos).  
   - Normalizar botão Whats/telefone.
2. **Entregar Patch 02**  
   - `data/analytics.js` com contagem de cliques/usuários (Firebase).  
   - Melhorias PWA (SW com estratégias de cache).
3. **Quando as imagens chegarem**  
   - Lazy-loading + tamanhos responsivos, e “Gerar Card”.

## O que ainda preciso (quando possível)
- **Pasta de imagens** (pode ser um subset representativo) ou apontar URLs reais que o site usa.
- **Config Firebase** com placeholders (para eu respeitar a estrutura exata de nós).
- Qualquer regra específica de **ordenamento** e **exibição** (ex.: empresas fixadas/aleatórias).

---

_Obs.: Também gerei **previews** dos cabeçalhos/rodapés de arquivos-chave para referência rápida._
