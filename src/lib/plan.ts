import type { Tenant } from "@/types"

const TRIAL_DAYS = 30

// null = não é trial (ou faltam dados pra calcular) — plano completo sem contagem.
export function getTrialDaysRemaining(tenant: Pick<Tenant, "subscription"> | null): number | null {
  const subscription = tenant?.subscription
  if (!subscription || subscription.status !== "trial" || !subscription.startedAt) return null

  const startedAt = new Date(subscription.startedAt).getTime()
  if (Number.isNaN(startedAt)) return null

  const elapsedDays = Math.floor((Date.now() - startedAt) / (1000 * 60 * 60 * 24))
  return Math.max(TRIAL_DAYS - elapsedDays, 0)
}

export function getPlanLabel(tenant: Pick<Tenant, "effectivePlan" | "subscription"> | null): string {
  if (!tenant) return ""
  if (tenant.effectivePlan === "basico") return "Plano básico"

  const daysRemaining = getTrialDaysRemaining(tenant)
  return daysRemaining !== null ? `Trial — ${daysRemaining} dia(s) restante(s)` : "Plano completo"
}
