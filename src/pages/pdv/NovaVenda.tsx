import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { PencilLine, Search, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api } from "@/services/api"
import { createPosSale } from "@/services/pos"
import { useTenant } from "@/contexts/TenantContext"
import { cn } from "@/lib/utils"
import { formatPrice, getApiErrorMessage } from "@/lib/utils-api"
import type { Category, PosPaymentMethod, PosSaleInput, Product } from "@/types"
import { addLine, cartCount, cartTotal, type CartLine } from "./cart"
import { CartPanel } from "./CartPanel"
import { CustomItemDialog } from "./CustomItemDialog"
import { PaymentDialog } from "./PaymentDialog"
import { ProductOptionsDialog } from "./ProductOptionsDialog"

const ALL_CATEGORIES = "all"

export function NovaVenda() {
  const { tenant } = useTenant()
  const slug = tenant?.slug

  const [products, setProducts] = useState<Product[]>([])
  const [sizedCategoryIds, setSizedCategoryIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)

  const [cart, setCart] = useState<CartLine[]>([])
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Gerado ao abrir o pagamento e reaproveitado em novas tentativas (idempotência);
  // zerado sempre que o carrinho muda, para não reenviar itens diferentes sob o mesmo id.
  const clientIdRef = useRef<string | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    clientIdRef.current = null
  }, [cart])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
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
      setLoadError(true)
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

  function addToCart(line: CartLine) {
    setCart((current) => addLine(current, line))
  }

  function handleProductClick(product: Product) {
    if (product.variants.length > 0 || product.extras.length > 0) {
      setOptionsProduct(product)
      return
    }
    addToCart({
      key: `p:${product.id}::`,
      kind: "product",
      name: product.name,
      unitPrice: product.basePrice ?? 0,
      quantity: 1,
      productId: product.id,
      extraIds: [],
    })
  }

  function changeQuantity(key: string, delta: number) {
    setCart((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line))
    )
  }

  function openPayment() {
    if (cart.length === 0) return
    clientIdRef.current ??= crypto.randomUUID()
    setCartSheetOpen(false)
    setPaymentOpen(true)
  }

  async function confirmSale(paymentMethod: PosPaymentMethod) {
    if (submittingRef.current || cart.length === 0 || !clientIdRef.current) return
    submittingRef.current = true
    setSubmitting(true)

    const input: PosSaleInput = {
      clientId: clientIdRef.current,
      paymentMethod,
      items: cart.map((line) =>
        line.kind === "custom"
          ? { type: "custom", name: line.name, unitPrice: line.unitPrice, quantity: line.quantity }
          : {
              type: "product",
              productId: line.productId!,
              ...(line.variantId ? { variantId: line.variantId } : {}),
              ...(line.extraIds && line.extraIds.length > 0 ? { extraIds: line.extraIds } : {}),
              quantity: line.quantity,
            }
      ),
    }

    try {
      await createPosSale(input)
      toast.success("Venda registrada", { position: "top-center" })
      setPaymentOpen(false)
      setCart([])
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Erro ao registrar a venda"), { position: "top-center" })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const count = cartCount(cart)
  const total = cartTotal(cart)

  const cartPanel = (
    <CartPanel
      lines={cart}
      onChangeQuantity={changeQuantity}
      onRemove={(key) => setCart((current) => current.filter((line) => line.key !== key))}
      onClear={() => setCart([])}
      onCheckout={openPayment}
    />
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
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
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-10 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar os produtos.</p>
            <Button variant="outline" onClick={load}>
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
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(product.basePrice ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-xl border border-border bg-card p-4">{cartPanel}</div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 lg:hidden">
        <Button className="h-12 w-full justify-between text-base" onClick={() => setCartSheetOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            {count} {count === 1 ? "item" : "itens"}
          </span>
          <span>{formatPrice(total)}</span>
        </Button>
      </div>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="sr-only">Carrinho</SheetTitle>
            <SheetDescription className="sr-only">Itens da venda atual</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{cartPanel}</div>
        </SheetContent>
      </Sheet>

      <ProductOptionsDialog product={optionsProduct} onClose={() => setOptionsProduct(null)} onAdd={addToCart} />
      <CustomItemDialog open={customOpen} onOpenChange={setCustomOpen} onAdd={addToCart} />
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        submitting={submitting}
        onConfirm={confirmSale}
      />
    </div>
  )
}
