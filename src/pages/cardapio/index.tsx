import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ImageOff, MoreVertical, Pencil, Plus, Power, Trash2 } from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategoryFormSheet } from "@/components/CategoryFormSheet"
import { CategorySizes } from "@/components/CategorySizes"
import { CategoryCrusts } from "@/components/CategoryCrusts"
import { ProductFormSheet } from "@/components/ProductFormSheet"
import { api } from "@/services/api"
import { getMyTenant } from "@/services/tenant"
import { showApiError, formatPrice } from "@/lib/utils-api"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import type { Category, CategoryCrust, CategorySize, Product, ProductBadge } from "@/types"

const PRODUCT_BADGE_LABELS: Record<ProductBadge, string> = {
  mais_pedido: "Mais pedido",
  promocao: "Promoção",
  novo: "Novo",
}

export function CardapioPage() {
  const owner = isStoreOwner(getStoredUser())
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const [productSheetOpen, setProductSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productDefaultCategoryId, setProductDefaultCategoryId] = useState<string | undefined>(undefined)

  async function loadAll() {
    try {
      setLoading(true)
      const [categoriesRes, productsRes] = await Promise.all([
        api.get<Omit<Category, "sizes" | "crusts">[]>("/categories"),
        api.get<Product[]>("/products"),
      ])

      // GET /categories não retorna sizes/crusts (só o cardápio público retorna
      // essa parte). Buscamos o cardápio público da própria loja como fonte
      // complementar só para saber quais categorias têm tamanho e quais são
      // seus tamanhos/bordas — se essa chamada falhar (loja inativa, rede,
      // etc.), seguimos tratando toda categoria como "sem tamanho".
      let detailsByCategory = new Map<string, { sizes: CategorySize[]; crusts: CategoryCrust[] }>()
      try {
        const tenantRes = await getMyTenant()
        const menuRes = await api.get<{
          categories: { id: string; sizes: CategorySize[]; crusts: CategoryCrust[] }[]
        }>(`/store/${tenantRes.data.slug}/menu`)
        detailsByCategory = new Map(
          menuRes.data.categories.map((category) => [category.id, { sizes: category.sizes, crusts: category.crusts }])
        )
      } catch {
        // best-effort — sem essa parte, o formulário de produto trata a
        // categoria como sem tamanho, que é o comportamento seguro.
      }

      const enrichedCategories = categoriesRes.data.map((category) => ({
        ...category,
        sizes: detailsByCategory.get(category.id)?.sizes ?? [],
        crusts: detailsByCategory.get(category.id)?.crusts ?? [],
      }))

      setCategories(enrichedCategories)
      setProducts(productsRes.data)
      setEditingCategory((current) => {
        if (!current) return current
        return enrichedCategories.find((c) => c.id === current.id) ?? current
      })
      setEditingProduct((current) => {
        if (!current) return current
        return productsRes.data.find((p) => p.id === current.id) ?? current
      })
    } catch (error) {
      showApiError(error, "Erro ao carregar o cardápio")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function openCreateCategory() {
    setEditingCategory(null)
    setCategorySheetOpen(true)
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category)
    setCategorySheetOpen(true)
  }

  async function handleDeleteCategory(category: Category) {
    try {
      await api.delete(`/categories/${category.id}`)
      toast.success("Categoria removida!", { position: "top-center" })
      setCategoryToDelete(null)
      await loadAll()
    } catch (error) {
      showApiError(error, "Erro ao remover categoria")
    }
  }

  function openCreateProduct(categoryId: string) {
    setEditingProduct(null)
    setProductDefaultCategoryId(categoryId)
    setProductSheetOpen(true)
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product)
    setProductDefaultCategoryId(undefined)
    setProductSheetOpen(true)
  }

  async function handleDeleteProduct(product: Product) {
    try {
      await api.delete(`/products/${product.id}`)
      toast.success("Produto removido!", { position: "top-center" })
      await loadAll()
    } catch (error) {
      showApiError(error, "Erro ao remover produto")
    }
  }

  async function handleToggleProductActive(product: Product) {
    try {
      const formData = new FormData()
      formData.append("isActive", String(!product.isActive))
      await api.put(`/products/${product.id}`, formData)
      toast.success(product.isActive ? "Produto desativado" : "Produto ativado", { position: "top-center" })
      await loadAll()
    } catch (error) {
      showApiError(error, "Erro ao atualizar produto")
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Cardápio</h1>
            <p className="text-sm text-muted-foreground">Categorias, produtos, tamanhos e bordas da sua loja.</p>
          </div>
          {owner && (
            <Button onClick={openCreateCategory} className="gap-1.5">
              <Plus className="size-4" />
              Nova categoria
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <Accordion type="multiple" className="rounded-xl border border-border bg-card px-4">
            {categories.map((category) => {
              const categoryProducts = products.filter((p) => p.categoryId === category.id)

              return (
                <AccordionItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {category.name}
                        {!category.isActive && <Badge variant="secondary">Inativa</Badge>}
                        <span className="text-xs font-normal text-muted-foreground">
                          {categoryProducts.length} produto(s)
                        </span>
                      </span>
                    </AccordionTrigger>
                    {owner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Opções de ${category.name}`}>
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEditCategory(category)}>
                            <Pencil className="size-3.5" />
                            Editar nome
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setCategoryToDelete(category)}>
                            <Trash2 className="size-3.5" />
                            Excluir categoria
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <AccordionContent className="flex flex-col gap-4">
                    {/* Sempre visíveis (não só quando já existe tamanho/borda): é aqui
                        que o lojista cadastra o primeiro de cada — escondidas atrás de
                        "existe pelo menos um" elas nunca conseguiriam começar. */}
                    <div className="rounded-lg border border-border p-3">
                      <CategorySizes
                        categoryId={category.id}
                        sizes={category.sizes}
                        canManage={owner}
                        onChanged={loadAll}
                      />
                    </div>

                    <div className="rounded-lg border border-border p-3">
                      <CategoryCrusts
                        categoryId={category.id}
                        crusts={category.crusts}
                        canManage={owner}
                        onChanged={loadAll}
                      />
                    </div>

                    {categoryProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum produto nesta categoria.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {categoryProducts.map((product) => (
                          <li
                            key={product.id}
                            className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2 ${
                              product.isActive ? "" : "opacity-60"
                            }`}
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="size-12 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <ImageOff className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                                {product.badge && <Badge>{PRODUCT_BADGE_LABELS[product.badge]}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {product.basePrice !== null ? formatPrice(product.basePrice) : "Preço por tamanho"}
                              </p>
                            </div>
                            {owner && (
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  title="Editar produto"
                                  onClick={() => openEditProduct(product)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  title={product.isActive ? "Desativar" : "Ativar"}
                                  onClick={() => handleToggleProductActive(product)}
                                >
                                  <Power className="size-3.5" />
                                </Button>
                                <ConfirmDialog
                                  trigger={
                                    <Button variant="destructive" size="icon-sm" title="Excluir">
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  }
                                  title={`Excluir ${product.name}?`}
                                  description="O produto será desativado e deixará de aparecer no cardápio da loja."
                                  confirmText="Excluir"
                                  destructive
                                  onConfirm={() => handleDeleteProduct(product)}
                                />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {owner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit gap-1.5"
                        onClick={() => openCreateProduct(category.id)}
                      >
                        <Plus className="size-3.5" />
                        Adicionar produto
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </div>

      <CategoryFormSheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        category={editingCategory}
        onSaved={loadAll}
      />

      <ProductFormSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        categories={categories}
        product={editingProduct}
        defaultCategoryId={productDefaultCategoryId}
        onSaved={loadAll}
        onCreated={setEditingProduct}
      />

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null)
        }}
        title={`Excluir ${categoryToDelete?.name}?`}
        description="Categorias com produtos vinculados não podem ser excluídas."
        confirmText="Excluir"
        destructive
        onConfirm={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
      />
    </AppLayout>
  )
}
