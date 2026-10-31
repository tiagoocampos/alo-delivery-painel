import { api } from "@/services/api"
import type { PosSale, PosSaleInput, PosSalesResponse } from "@/types"

export function createPosSale(input: PosSaleInput) {
  return api.post<PosSale>("/pos/sales", input)
}

export function listPosSales(date: string) {
  return api.get<PosSalesResponse>("/pos/sales", { params: { date } })
}

export function cancelPosSale(id: string, reason: string) {
  return api.patch(`/pos/sales/${id}/cancel`, { reason })
}
