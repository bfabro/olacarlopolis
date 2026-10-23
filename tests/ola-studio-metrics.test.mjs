import test from "node:test";
import assert from "node:assert/strict";
import { estimateProcessingTiming, processingElapsedSeconds } from "../shared/studio-metrics.mjs";

test("tempo concluído usa os timestamps reais do trabalho", () => {
  const job = { status: "completed", progress: 100, createdAt: 1_000, completedAt: 61_000 };
  assert.equal(processingElapsedSeconds(job, 99_000), 60);
  assert.deepEqual(estimateProcessingTiming(job, [], 99_000), { elapsedSeconds: 60, complete: true, totalSeconds: 60, remainingLowSeconds: 0, remainingHighSeconds: 0 });
});

test("previsão combina histórico e andamento sem prometer tempo exato", () => {
  const job = { status: "rendering", progress: 60, createdAt: 1_000, costEstimate: { processingUnits: 100 } };
  const timing = estimateProcessingTiming(job, [{ elapsedSeconds: 1000, processingUnits: 100 }, { elapsedSeconds: 1200, processingUnits: 100 }], 301_000);
  assert.equal(timing.complete, false);
  assert.equal(timing.calculating, false);
  assert.ok(timing.remainingHighSeconds > timing.remainingLowSeconds);
  assert.ok(timing.totalSeconds > timing.elapsedSeconds);
});

test("sem histórico ou progresso suficiente mantém estado calculando", () => {
  const timing = estimateProcessingTiming({ status: "queued", progress: 25, createdAt: 1_000 }, [], 5_000);
  assert.equal(timing.calculating, true);
});
