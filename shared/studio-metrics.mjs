function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function processingElapsedSeconds(job = {}, now = Date.now()) {
  const start = finite(job.createdAt || job.startedAt);
  if (!start) return 0;
  const end = finite(job.completedAt || job.failedAt || job.cancelledAt || now, now);
  return Math.max(0, Math.round((end - start) / 1000));
}

export function estimateProcessingTiming(job = {}, historicalCosts = [], now = Date.now()) {
  const elapsedSeconds = processingElapsedSeconds(job, now);
  const complete = job.status === "completed" || finite(job.progress) >= 100;
  if (complete) return { elapsedSeconds, complete: true, totalSeconds: elapsedSeconds, remainingLowSeconds: 0, remainingHighSeconds: 0 };
  const ratios = historicalCosts.map((item) => {
    const seconds = finite(item?.elapsedSeconds);
    const units = finite(item?.processingUnits);
    return seconds > 4 && seconds < 14400 && units > 0 ? seconds / units : 0;
  });
  const secondsPerUnit = median(ratios);
  const units = finite(job.costEstimate?.processingUnits);
  const historicalTotal = secondsPerUnit && units ? secondsPerUnit * units : 0;
  const progress = Math.min(99, Math.max(0, finite(job.progress)));
  const dynamicTotal = elapsedSeconds >= 10 && progress >= 31 ? elapsedSeconds / Math.max(.08, progress / 100) : 0;
  let predictedTotal = historicalTotal && dynamicTotal ? historicalTotal * .72 + dynamicTotal * .28 : historicalTotal || dynamicTotal;
  if (!predictedTotal) return { elapsedSeconds, complete: false, calculating: true, totalSeconds: 0, remainingLowSeconds: 0, remainingHighSeconds: 0 };
  predictedTotal = Math.max(elapsedSeconds + 10, predictedTotal);
  const totalLow = Math.max(elapsedSeconds, Math.round(predictedTotal * .8));
  const totalHigh = Math.max(totalLow + 1, Math.round(predictedTotal * 1.25));
  return { elapsedSeconds, complete: false, calculating: false, totalSeconds: Math.round(predictedTotal), remainingLowSeconds: Math.max(0, totalLow - elapsedSeconds), remainingHighSeconds: Math.max(1, totalHigh - elapsedSeconds) };
}
