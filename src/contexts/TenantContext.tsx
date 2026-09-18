import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { getMyTenant } from "@/services/tenant"
import { showApiError } from "@/lib/utils-api"
import { getToken } from "@/lib/auth"
import type { Tenant } from "@/types"

interface TenantContextValue {
  tenant: Tenant | null
  loading: boolean
  refetch: () => Promise<void>
  setTenant: (tenant: Tenant) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(false)

  async function refetch() {
    if (!getToken()) {
      setTenant(null)
      return
    }
    try {
      setLoading(true)
      const response = await getMyTenant()
      setTenant(response.data)
    } catch (error) {
      showApiError(error, "Erro ao carregar dados da loja")
    } finally {
      setLoading(false)
    }
  }

  // Busca o tenant assim que houver um token — inclusive logo após o login,
  // quando a navegação troca de rota mas este provider (montado uma vez no
  // topo da árvore) não remonta sozinho.
  useEffect(() => {
    if (!getToken()) {
      setTenant(null)
      return
    }
    if (tenant) return
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <TenantContext.Provider value={{ tenant, loading, refetch, setTenant }}>{children}</TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (!context) throw new Error("useTenant must be used within a TenantProvider")
  return context
}
