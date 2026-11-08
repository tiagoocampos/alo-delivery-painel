import type { Tenant } from "@/types"

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL

// Endereço público da loja online (o que o cliente usa para pedir). Fonte única:
// o botão "Ver minha loja" e o tutorial usam o mesmo link.
export function getStoreUrl(tenant: Pick<Tenant, "slug"> | null): string | null {
  return tenant ? `${STOREFRONT_URL}/${tenant.slug}` : null
}
