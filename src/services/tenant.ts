import { api } from "@/services/api"
import type { BusinessHourEntry, Tenant } from "@/types"

export function getMyTenant() {
  return api.get<Tenant>("/tenant/me")
}

export function updateMyTenantName(name: string) {
  return api.put<Tenant>("/tenant/me", { name })
}

export interface UpdateTenantProfileInput {
  logo?: File | null
  banner?: File | null
  favicon?: File | null
  description?: string
  address?: string
  instagramUrl?: string
  pixKey?: string
  minimumOrderValue?: number
  businessHours?: BusinessHourEntry[]
}

export function updateMyTenantProfile(input: UpdateTenantProfileInput) {
  const formData = new FormData()
  if (input.logo) formData.append("logo", input.logo)
  if (input.banner) formData.append("banner", input.banner)
  if (input.favicon) formData.append("favicon", input.favicon)
  if (input.description !== undefined) formData.append("description", input.description)
  if (input.address !== undefined) formData.append("address", input.address)
  if (input.instagramUrl !== undefined) formData.append("instagramUrl", input.instagramUrl)
  if (input.pixKey !== undefined) formData.append("pixKey", input.pixKey)
  if (input.minimumOrderValue !== undefined) formData.append("minimumOrderValue", String(input.minimumOrderValue))
  if (input.businessHours !== undefined) formData.append("businessHours", JSON.stringify(input.businessHours))
  return api.put<Tenant>("/tenant/me", formData)
}
