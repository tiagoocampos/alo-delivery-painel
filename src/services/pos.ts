import { api } from "@/services/api"
import type {
  PosPaymentMethod,
  PosSale,
  PosSaleInput,
  PosSaleItemInput,
  PosSalesResponse,
  PosTableDetail,
  PosTableSummary,
} from "@/types"

export function createPosSale(input: PosSaleInput) {
  return api.post<PosSale>("/pos/sales", input)
}

export function listPosSales(date: string) {
  return api.get<PosSalesResponse>("/pos/sales", { params: { date } })
}

export function cancelPosSale(id: string, reason: string) {
  return api.patch(`/pos/sales/${id}/cancel`, { reason })
}

export function listPosTables() {
  return api.get<PosTableSummary[]>("/pos/tables")
}

export function openPosTable(label: string) {
  return api.post<PosTableDetail>("/pos/tables", { label })
}

export function getPosTable(id: string) {
  return api.get<PosTableDetail>(`/pos/tables/${id}`)
}

export function addPosTableItem(id: string, item: PosSaleItemInput) {
  return api.post<PosTableDetail>(`/pos/tables/${id}/items`, item)
}

export function updatePosTableItem(id: string, itemId: string, quantity: number) {
  return api.patch<PosTableDetail>(`/pos/tables/${id}/items/${itemId}`, { quantity })
}

export function removePosTableItem(id: string, itemId: string) {
  return api.delete<PosTableDetail>(`/pos/tables/${id}/items/${itemId}`)
}

export function closePosTable(id: string, paymentMethod: PosPaymentMethod) {
  return api.post<PosTableDetail>(`/pos/tables/${id}/close`, { paymentMethod })
}

export function discardPosTable(id: string) {
  return api.delete(`/pos/tables/${id}`)
}

export function cancelPosTable(id: string, reason: string) {
  return api.patch(`/pos/tables/${id}/cancel`, { reason })
}
