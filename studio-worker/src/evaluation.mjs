const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

export function planMetrics(plan = {}) {
  const scenes = plan.scenes || [];
  const sources = new Set(scenes.map((scene) => scene.sourceId));
  let repeated = 0;
  let continuityEvidence = 0;
  scenes.forEach((scene, index) => {
    if (index && scene.sourceId === scenes[index - 1].sourceId && Math.abs(Number(scene.start || 0) - Number(scenes[index - 1].start || 0)) < 0.12) repeated += 1;
    if (scene.selection?.continuityIntent || scene.selection?.temporalPhase) continuityEvidence += 1;
  });
  const synced = scenes.filter((scene) => scene.rhythmSynced).length;
  return {
    sceneCount: scenes.length,
    sourceDiversity: round(sources.size / Math.max(1, scenes.length)),
    repeatedScenes: repeated,
    continuityEvidenceRatio: round(continuityEvidence / Math.max(1, scenes.length)),
    beatSyncRatio: round(synced / Math.max(1, scenes.length)),
    speechScenes: scenes.filter((scene) => scene.hasSpeech).length,
    generatedHighlights: (plan.textLayers || []).filter((layer) => String(layer.id || "").startsWith("advanced-highlight-")).length,
    duration: Number(plan.duration || 0),
    planner: plan.planner?.type || "unknown"
  };
}

export function compareDirectorPlans(baseline, advanced, runtime = {}) {
  return {
    generatedAt: new Date().toISOString(),
    baseline: planMetrics(baseline),
    advanced: planMetrics(advanced),
    runtime: { baselineSeconds: Number(runtime.baselineSeconds || 0), advancedSeconds: Number(runtime.advancedSeconds || 0), advancedEstimatedCostUsd: Number(runtime.advancedEstimatedCostUsd || advanced?.aiDirector?.estimatedCostUsd || 0) },
    interpretation: "As métricas são estruturais e não substituem avaliação humana da qualidade criativa.",
    humanRubric: humanEvaluationRubric()
  };
}

export function humanEvaluationRubric() {
  return [
    { id: "narrative", label: "Coerência narrativa", scale: "1-5" },
    { id: "continuity", label: "Continuidade entre planos", scale: "1-5" },
    { id: "rhythm", label: "Ritmo e relação com a música", scale: "1-5" },
    { id: "relevance", label: "Relevância dos momentos escolhidos", scale: "1-5" },
    { id: "text", label: "Pertinência e legibilidade dos textos", scale: "1-5" },
    { id: "finish", label: "Qualidade percebida do acabamento", scale: "1-5" }
  ];
}
