import { api } from "@/services/api"
import type { Tenant } from "@/types"

export function getMyTenant() {
  return api.get<Tenant>("/tenant/me")
}

export function updateMyTenantName(name: string) {
  return api.put<Tenant>("/tenant/me", { name })
}
