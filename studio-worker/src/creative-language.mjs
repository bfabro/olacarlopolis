const TONES = new Set(["conversational", "professional", "warm", "energetic", "calm"]);

const TONE_DIRECTIONS = Object.freeze({
  conversational: "conversacional, humano, próximo e espontâneo, como alguém da cidade falando diretamente com outra pessoa",
  professional: "profissional e seguro, mas ainda natural e fácil de ouvir",
  warm: "acolhedor, próximo e simpático",
  energetic: "animado, convidativo e ágil, sem exagero publicitário",
  calm: "calmo, elegante e inspirador"
});

const STYLE_INTENTS = Object.freeze({
  institucional: "apresentar identidade, confiança e propósito",
  reels: "prender a atenção rapidamente e conduzir a uma mensagem simples",
  comercial: "mostrar um benefício real e motivar uma ação",
  comercio_local: "aproximar a empresa das pessoas da cidade",
  imoveis: "ajudar a pessoa a imaginar a experiência de conhecer ou morar no imóvel",
  gastronomia: "despertar vontade e valorizar a experiência",
  eventos: "transmitir energia, momentos marcantes e convite",
  turismo: "despertar curiosidade e vontade de conhecer o lugar"
});

export function normalizeNarrationTone(value, fallback = "conversational") {
  return TONES.has(value) ? value : fallback;
}

export function intentFirstNarrationGuidance(project = {}, options = {}) {
  const tone = normalizeNarrationTone(project.narration?.tone);
  const styleIntent = STYLE_INTENTS[project.style] || "comunicar uma ideia clara e relevante para o público";
  const maximumWords = Math.max(12, Number(options.maximumWords || 80));
  return [
    "Antes de escrever qualquer texto, defina o intuito central do vídeo, quem deve se interessar e qual sensação ou ação o vídeo pretende despertar.",
    "O objetivo criativo informado pelo usuário é a prioridade. As imagens, os vídeos e as transcrições servem como evidência e apoio para essa mensagem; não transforme o roteiro em uma descrição literal dos cenários.",
    `Para este modelo, a intenção geral é ${styleIntent}.`,
    `Escreva em português brasileiro com linguagem ${TONE_DIRECTIONS[tone]}.`,
    "Fale com o espectador, conecte uma ideia à seguinte e use frases curtas que soem bem quando pronunciadas.",
    "Evite linguagem burocrática, listas de objetos, adjetivos vazios, clichês de propaganda e frases como 'vemos na imagem', 'nesta cena', 'o vídeo mostra' ou equivalentes.",
    "Não invente benefícios, histórias, preços, nomes, características ou promessas. Quando a evidência for insuficiente, use uma mensagem simples apoiada no objetivo do usuário.",
    `O roteiro completo deve ter no máximo ${maximumWords} palavras e precisa formar uma pequena história com abertura, desenvolvimento e encerramento.`
  ].join(" ");
}
