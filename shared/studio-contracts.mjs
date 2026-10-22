export const STUDIO_SCHEMA_VERSION = 2;

export const STUDIO_LIMITS = Object.freeze({
  maxFiles: 10,
  maxVideoBytes: 250 * 1024 * 1024,
  maxImageBytes: 20 * 1024 * 1024,
  maxAudioBytes: 25 * 1024 * 1024,
  maxProjectBytes: 1024 * 1024 * 1024,
  maxSourceDurationSeconds: 10 * 60,
  maxOutputDurationSeconds: 90,
  retentionDays: 30,
  maxConcurrentJobsPerUser: 1
});

export const STUDIO_EDIT_STYLES = Object.freeze({
  institucional: Object.freeze({
    id: "institucional",
    label: "Institucional",
    minClipSeconds: 3.2,
    maxClipSeconds: 7,
    transitionSeconds: 0.75,
    transition: "fade",
    musicVolume: 0.18,
    pace: "calmo"
  }),
  reels: Object.freeze({
    id: "reels",
    label: "Reels",
    minClipSeconds: 1.25,
    maxClipSeconds: 3.5,
    transitionSeconds: 0.22,
    transition: "smoothleft",
    musicVolume: 0.24,
    pace: "dinamico"
  }),
  comercial: Object.freeze({
    id: "comercial",
    label: "Comercial",
    minClipSeconds: 2.1,
    maxClipSeconds: 5,
    transitionSeconds: 0.45,
    transition: "fadeblack",
    musicVolume: 0.2,
    pace: "promocional"
  }),
  comercio_local: Object.freeze({
    id: "comercio_local", label: "Comércio local", minClipSeconds: 2.2, maxClipSeconds: 4.8,
    transitionSeconds: 0.4, transition: "dissolve", musicVolume: 0.2, pace: "equilibrado"
  }),
  imoveis: Object.freeze({
    id: "imoveis", label: "Imóveis", minClipSeconds: 3, maxClipSeconds: 6,
    transitionSeconds: 0.65, transition: "smoothleft", musicVolume: 0.16, pace: "suave"
  }),
  gastronomia: Object.freeze({
    id: "gastronomia", label: "Gastronomia", minClipSeconds: 1.8, maxClipSeconds: 4,
    transitionSeconds: 0.35, transition: "zoomin", musicVolume: 0.22, pace: "dinamico"
  }),
  eventos: Object.freeze({
    id: "eventos", label: "Eventos", minClipSeconds: 1.4, maxClipSeconds: 3.8,
    transitionSeconds: 0.25, transition: "fadewhite", musicVolume: 0.25, pace: "dinamico"
  }),
  turismo: Object.freeze({
    id: "turismo", label: "Turismo", minClipSeconds: 3.5, maxClipSeconds: 7,
    transitionSeconds: 0.8, transition: "fade", musicVolume: 0.18, pace: "suave"
  })
});

export const STUDIO_TRANSITIONS = Object.freeze({
  auto: Object.freeze({ id: "auto", label: "Automática", ffmpeg: "auto" }),
  fade: Object.freeze({ id: "fade", label: "Fade", ffmpeg: "fade" }),
  dissolve: Object.freeze({ id: "dissolve", label: "Cross Dissolve", ffmpeg: "dissolve" }),
  zoomin: Object.freeze({ id: "zoomin", label: "Zoom In", ffmpeg: "zoomin" }),
  zoomout: Object.freeze({ id: "zoomout", label: "Zoom Out", ffmpeg: "zoomout" }),
  slide: Object.freeze({ id: "slide", label: "Slide", ffmpeg: "slideleft" }),
  wipe: Object.freeze({ id: "wipe", label: "Wipe", ffmpeg: "wipeleft" }),
  blur: Object.freeze({ id: "blur", label: "Blur", ffmpeg: "hblur" }),
  whip: Object.freeze({ id: "whip", label: "Whip Pan", ffmpeg: "smoothleft" }),
  flash: Object.freeze({ id: "flash", label: "Flash", ffmpeg: "fadewhite" }),
  match: Object.freeze({ id: "match", label: "Match Cut técnico", ffmpeg: "circleopen" }),
  hardcut: Object.freeze({ id: "hardcut", label: "Hard Cut", ffmpeg: "hardcut" }),
  dipblack: Object.freeze({ id: "dipblack", label: "Dip to Black", ffmpeg: "fadeblack" })
});

export const STUDIO_TEXT_PRESETS = Object.freeze({
  clean: Object.freeze({ id: "clean", label: "Clean moderno", font: "sans", color: "#FFFFFF", outline: "#092B45", background: true, animation: "fade" }),
  cinematic: Object.freeze({ id: "cinematic", label: "Cinematográfico", font: "serif", color: "#FFFFFF", outline: "#000000", background: false, animation: "slide_up" }),
  promo: Object.freeze({ id: "promo", label: "Oferta em destaque", font: "sans", color: "#FFBB2D", outline: "#092B45", background: true, animation: "zoom_pop" }),
  local: Object.freeze({ id: "local", label: "Comércio local", font: "sans", color: "#FFFFFF", outline: "#092B45", background: true, animation: "reveal" }),
  minimal: Object.freeze({ id: "minimal", label: "Minimalista", font: "sans", color: "#FFFFFF", outline: "#000000", background: false, animation: "fade" }),
  impact: Object.freeze({ id: "impact", label: "Impacto para Reels", font: "sans", color: "#FFBB2D", outline: "#000000", background: false, animation: "word_by_word" })
});

export const STUDIO_TEXT_ANIMATIONS = Object.freeze(["fade", "slide_up", "slide_down", "typewriter", "zoom_pop", "soft_bounce", "reveal", "word_by_word"]);

export const STUDIO_FORMATS = Object.freeze({
  "9:16": Object.freeze({ id: "9:16", width: 1080, height: 1920, label: "Vertical" }),
  "16:9": Object.freeze({ id: "16:9", width: 1920, height: 1080, label: "Horizontal" }),
  "1:1": Object.freeze({ id: "1:1", width: 1080, height: 1080, label: "Quadrado" })
});

export const STUDIO_DURATIONS = Object.freeze([15, 30, 60, 90]);

const text = (value, max = 180) => String(value || "").trim().slice(0, max);
const numberBetween = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toUpperCase() : fallback;

export function studioOutputDimensions(format) {
  return STUDIO_FORMATS[format] || STUDIO_FORMATS["9:16"];
}

export function studioStyleParameters(style) {
  return STUDIO_EDIT_STYLES[style] || STUDIO_EDIT_STYLES.institucional;
}

export function studioTransitionParameters(transition, style) {
  const selected = STUDIO_TRANSITIONS[transition] || STUDIO_TRANSITIONS.auto;
  if (selected.id !== "auto") return selected;
  const automatic = studioStyleParameters(style).transition;
  return Object.values(STUDIO_TRANSITIONS).find((item) => item.ffmpeg === automatic || item.id === automatic) || STUDIO_TRANSITIONS.fade;
}

export function normalizeStudioProject(input = {}) {
  const format = STUDIO_FORMATS[input.format] ? input.format : "9:16";
  const style = STUDIO_EDIT_STYLES[input.style] ? input.style : "institucional";
  const duration = STUDIO_DURATIONS.includes(Number(input.duration)) ? Number(input.duration) : 30;
  const preset = STUDIO_TEXT_PRESETS[input.textDesign?.preset] || STUDIO_TEXT_PRESETS.clean;
  const animation = STUDIO_TEXT_ANIMATIONS.includes(input.textDesign?.animation) ? input.textDesign.animation : preset.animation;
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    name: text(input.name, 100) || "Novo video",
    style,
    format,
    duration,
    title: text(input.title, 120),
    subtitle: text(input.subtitle, 180),
    sceneDescription: text(input.sceneDescription, 180),
    personName: text(input.personName, 80),
    personRole: text(input.personRole, 100),
    offerText: text(input.offerText, 80),
    promoText: text(input.promoText, 120),
    closingText: text(input.closingText, 140),
    callToAction: text(input.callToAction, 100),
    transition: STUDIO_TRANSITIONS[input.transition] ? input.transition : "auto",
    transitionDuration: numberBetween(input.transitionDuration, 0.1, 1.5, studioStyleParameters(style).transitionSeconds),
    textDesign: {
      preset: preset.id,
      animation,
      font: ["sans", "serif", "mono"].includes(input.textDesign?.font) ? input.textDesign.font : preset.font,
      sizeScale: numberBetween(input.textDesign?.sizeScale, 0.7, 1.8, 1),
      color: color(input.textDesign?.color, preset.color),
      outlineColor: color(input.textDesign?.outlineColor, preset.outline),
      background: input.textDesign?.background === undefined ? preset.background : input.textDesign.background === true,
      align: ["left", "center", "right"].includes(input.textDesign?.align) ? input.textDesign.align : "center",
      position: ["top", "center", "bottom"].includes(input.textDesign?.position) ? input.textDesign.position : "top",
      margin: numberBetween(input.textDesign?.margin, 24, 180, 64)
    },
    captionsEnabled: input.captionsEnabled === true,
    sources: Array.isArray(input.sources) ? input.sources.slice(0, STUDIO_LIMITS.maxFiles) : [],
    logo: input.logo || null,
    music: input.music || null
  };
}

export function validateStudioProject(input = {}) {
  const project = normalizeStudioProject(input);
  const errors = [];
  if (!project.sources.length) errors.push("Inclua ao menos uma foto ou video.");
  if (project.sources.length > STUDIO_LIMITS.maxFiles) errors.push("Quantidade de arquivos acima do limite.");
  const bytes = project.sources.reduce((sum, item) => sum + Number(item?.size || 0), 0);
  if (bytes > STUDIO_LIMITS.maxProjectBytes) errors.push("O projeto excede o limite total de 1 GB.");
  project.sources.forEach((source, index) => {
    if (!source?.storagePath) errors.push(`Arquivo ${index + 1} sem caminho de armazenamento.`);
    if (!String(source?.contentType || "").match(/^(video|image)\//)) errors.push(`Arquivo ${index + 1} possui tipo invalido.`);
  });
  return { valid: errors.length === 0, errors, value: project };
}

export function validateEditPlan(plan = {}) {
  const errors = [];
  const duration = Number(plan.duration || 0);
  if (Number(plan.schemaVersion) !== STUDIO_SCHEMA_VERSION) errors.push("Versao do plano de edicao invalida.");
  if (!STUDIO_EDIT_STYLES[plan.style]) errors.push("Estilo de edicao invalido.");
  if (!STUDIO_FORMATS[plan.format]) errors.push("Formato de saida invalido.");
  if (!(duration > 0 && duration <= STUDIO_LIMITS.maxOutputDurationSeconds)) errors.push("Duracao de saida invalida.");
  if (!Array.isArray(plan.scenes) || !plan.scenes.length) errors.push("O plano precisa conter cenas.");
  if (!Array.isArray(plan.textLayers)) errors.push("O plano precisa declarar as camadas de texto.");
  (plan.scenes || []).forEach((scene, index) => {
    const sceneDuration = Number(scene?.duration || 0);
    if (!text(scene?.sourceId, 160)) errors.push(`Cena ${index + 1} sem arquivo de origem.`);
    if (!(sceneDuration > 0 && sceneDuration <= 15)) errors.push(`Cena ${index + 1} com duracao invalida.`);
    if (Number(scene?.start || 0) < 0) errors.push(`Cena ${index + 1} com inicio invalido.`);
  });
  return { valid: errors.length === 0, errors };
}

export function studioJobCostEstimate(project = {}) {
  const normalized = normalizeStudioProject(project);
  const pixels = studioOutputDimensions(normalized.format).width * studioOutputDimensions(normalized.format).height;
  const resolutionFactor = pixels / (1080 * 1080);
  const styleFactor = normalized.style === "reels" ? 1.12 : normalized.style === "comercial" ? 1.08 : 1;
  const captionFactor = normalized.captionsEnabled ? 1.2 : 1;
  const processingUnits = Math.ceil(normalized.duration * resolutionFactor * styleFactor * captionFactor);
  return {
    processingUnits,
    estimatedCredits: Math.max(1, Math.ceil(processingUnits / 60)),
    formulaVersion: 1
  };
}
