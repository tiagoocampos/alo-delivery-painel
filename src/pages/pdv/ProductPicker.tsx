import { useMemo, useState } from "react"
import { PencilLine, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils-api"
import type { Product } from "@/types"
import { simpleProductLine, type CartLine } from "./cart"
import { CustomItemDialog } from "./CustomItemDialog"
import { ProductOptionsDialog } from "./ProductOptionsDialog"
import { useSellableProducts } from "./useSellableProducts"

const ALL_CATEGORIES = "all"

interface ProductPickerProps {
  onPick: (line: CartLine) => void
  actionLabel?: string
}

// Busca + categorias + grade de produtos + item avulso. Não sabe nada de carrinho ou mesa.
export function ProductPicker({ onPick, actionLabel = "Adicionar" }: ProductPickerProps) {
  const { sellable, loading, error, reload } = useSellableProducts()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)
  const [customOpen, setCustomOpen] = useState(false)

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sortOrder: number }>()
    sellable.forEach((product) => map.set(product.category.id, product.category))
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [sellable])

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase()
    return categories
      .filter((category) => activeCategory === ALL_CATEGORIES || category.id === activeCategory)
      .map((category) => ({
        category,
        items: sellable.filter(
          (product) => product.category.id === category.id && product.name.toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [categories, sellable, search, activeCategory])

  function handleProductClick(product: Product) {
    if (product.variants.length > 0 || product.extras.length > 0) {
      setOptionsProduct(product)
      return
    }
    onPick(simpleProductLine(product))
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8"
          />
        </div>
        <Button variant="outline" className="h-10 gap-2" onClick={() => setCustomOpen(true)}>
          <PencilLine className="size-4" />
          Item avulso
        </Button>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: ALL_CATEGORIES, name: "Todos" }, ...categories].map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors",
                activeCategory === category.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os produtos.</p>
          <Button variant="outline" onClick={reload}>
            Tentar de novo
          </Button>
        </div>
      ) : sellable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Cadastre produtos no Cardápio ou use Item avulso.
        </p>
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      ) : (
        groups.map(({ category, items }) => (
          <section key={category.id} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{category.name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductClick(product)}
                  className="flex min-h-20 flex-col justify-between gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent active:scale-[0.98]"
                >
                  <span className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</span>
                  <span className="text-sm font-semibold text-primary">{formatPrice(product.basePrice ?? 0)}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <ProductOptionsDialog
        product={optionsProduct}
        actionLabel={actionLabel}
        onClose={() => setOptionsProduct(null)}
        onAdd={onPick}
      />
      <CustomItemDialog open={customOpen} onOpenChange={setCustomOpen} actionLabel={actionLabel} onAdd={onPick} />
    </div>
  )
}
