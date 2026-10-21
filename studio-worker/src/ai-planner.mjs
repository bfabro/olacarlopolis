import { validateEditPlan } from "../../shared/studio-contracts.mjs";

export class SemanticPlannerNotConfigured {
  get enabled() { return false; }
  async createPlan() { throw new Error("Planejador semantico de IA nao configurado. O worker usara explicitamente o planejador tecnico deterministico."); }
}

export function validateSemanticPlan(plan) {
  const validation = validateEditPlan(plan);
  if (!validation.valid) throw new Error(`Plano semantico invalido: ${validation.errors.join(" ")}`);
  if (plan.planner?.type !== "semantic-ai") throw new Error("O plano de IA deve declarar planner.type como semantic-ai.");
  return plan;
}
