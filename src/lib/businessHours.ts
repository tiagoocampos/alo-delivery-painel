import type { BusinessHourEntry } from "@/types"

export function isStoreOpenNow(businessHours: BusinessHourEntry[] | null): boolean {
  if (!businessHours) return true // sem horário cadastrado = sempre aberto (não bloquear quem nunca configurou isso)

  const now = new Date()
  const today = businessHours.find((entry) => entry.dayOfWeek === now.getDay())
  if (!today || today.isClosed || !today.opensAt || !today.closesAt) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = today.opensAt.split(":").map(Number)
  const [closeH, closeM] = today.closesAt.split(":").map(Number)
  const opensAtMinutes = openH * 60 + openM
  const closesAtMinutes = closeH * 60 + closeM

  // Trata o caso de funcionamento que passa da meia-noite (ex: abre 18:00, fecha 01:00)
  if (closesAtMinutes < opensAtMinutes) {
    return currentMinutes >= opensAtMinutes || currentMinutes <= closesAtMinutes
  }

  return currentMinutes >= opensAtMinutes && currentMinutes <= closesAtMinutes
}
