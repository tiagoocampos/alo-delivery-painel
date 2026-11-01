import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import { useTenant } from "@/contexts/TenantContext"
import type { Category, Product } from "@/types"

// Produtos vendáveis no balcão: ativos, "ambos"/"balcao", com preço fixo e fora de categorias com tamanho.
export function useSellableProducts() {
  const { tenant } = useTenant()
  const slug = tenant?.slug

  const [products, setProducts] = useState<Product[]>([])
  const [sizedCategoryIds, setSizedCategoryIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const productsRes = await api.get<Product[]>("/products", { params: { isActive: true } })
      setProducts(productsRes.data)

      // GET /products não traz os tamanhos da categoria; o cardápio público da
      // própria loja traz. Best-effort: produto de categoria com tamanho não tem
      // basePrice, então o filtro por preço já cobre o caso se isto falhar.
      if (slug) {
        try {
          const menuRes = await api.get<{ categories: (Pick<Category, "id"> & { sizes?: unknown[] })[] }>(
            `/store/${slug}/menu`
          )
          setSizedCategoryIds(
            new Set(menuRes.data.categories.filter((c) => (c.sizes?.length ?? 0) > 0).map((c) => c.id))
          )
        } catch {
          // segue sem a lista de categorias com tamanho
        }
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const sellable = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isActive &&
          (product.availability === "ambos" || product.availability === "balcao") &&
          product.basePrice !== null &&
          !sizedCategoryIds.has(product.categoryId)
      ),
    [products, sizedCategoryIds]
  )

  return { sellable, loading, error, reload: load }
}
