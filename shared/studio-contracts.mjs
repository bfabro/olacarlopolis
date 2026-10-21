export const STUDIO_SCHEMA_VERSION = 1;

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
  })
});

export const STUDIO_FORMATS = Object.freeze({
  "9:16": Object.freeze({ id: "9:16", width: 1080, height: 1920, label: "Vertical" }),
  "16:9": Object.freeze({ id: "16:9", width: 1920, height: 1080, label: "Horizontal" }),
  "1:1": Object.freeze({ id: "1:1", width: 1080, height: 1080, label: "Quadrado" })
});

export const STUDIO_DURATIONS = Object.freeze([15, 30, 60, 90]);

const text = (value, max = 180) => String(value || "").trim().slice(0, max);

export function studioOutputDimensions(format) {
  return STUDIO_FORMATS[format] || STUDIO_FORMATS["9:16"];
}

export function studioStyleParameters(style) {
  return STUDIO_EDIT_STYLES[style] || STUDIO_EDIT_STYLES.institucional;
}

export function normalizeStudioProject(input = {}) {
  const format = STUDIO_FORMATS[input.format] ? input.format : "9:16";
  const style = STUDIO_EDIT_STYLES[input.style] ? input.style : "institucional";
  const duration = STUDIO_DURATIONS.includes(Number(input.duration)) ? Number(input.duration) : 30;
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    name: text(input.name, 100) || "Novo video",
    style,
    format,
    duration,
    title: text(input.title, 120),
    subtitle: text(input.subtitle, 180),
    callToAction: text(input.callToAction, 100),
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
