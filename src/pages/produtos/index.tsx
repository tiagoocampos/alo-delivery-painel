import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Power, Trash2 } from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ProductFormSheet } from "@/components/ProductFormSheet"
import { api } from "@/services/api"
import { showApiError, formatPrice } from "@/lib/utils-api"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import type { Category, Product } from "@/types"

export function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const owner = isStoreOwner(getStoredUser())

  async function loadCategories() {
    try {
      const response = await api.get<Category[]>("/categories")
      setCategories(response.data)
    } catch (error) {
      showApiError(error, "Erro ao carregar categorias")
    }
  }

  async function loadProducts() {
    try {
      setLoading(true)
      const response = await api.get<Product[]>("/products")
      setProducts(response.data)
      setEditingProduct((current) => {
        if (!current) return current
        return response.data.find((p) => p.id === current.id) ?? current
      })
    } catch (error) {
      showApiError(error, "Erro ao carregar produtos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  const visibleProducts =
    categoryFilter === "all" ? products : products.filter((p) => p.categoryId === categoryFilter)

  function openCreate() {
    setEditingProduct(null)
    setSheetOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setSheetOpen(true)
  }

  async function handleDelete(product: Product) {
    try {
      await api.delete(`/products/${product.id}`)
      toast.success("Produto removido!", { position: "top-center" })
      await loadProducts()
    } catch (error) {
      showApiError(error, "Erro ao remover produto")
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      const formData = new FormData()
      formData.append("isActive", String(!product.isActive))
      await api.put(`/products/${product.id}`, formData)
      toast.success(product.isActive ? "Produto desativado" : "Produto ativado", { position: "top-center" })
      await loadProducts()
    } catch (error) {
      showApiError(error, "Erro ao atualizar produto")
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Produtos</h1>
            <p className="text-sm text-muted-foreground">Gerencie o cardápio da sua loja.</p>
          </div>
          {owner && (
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="size-4" />
              Novo produto
            </Button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <Card key={product.id} className={!product.isActive ? "opacity-60" : undefined}>
                {product.imageUrl && (
                  <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" />
                )}
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{product.category.name}</p>
                  {product.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                  )}
                  <p className="text-sm font-semibold text-foreground">{formatPrice(product.basePrice)}</p>
                  {product.variants.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {product.variants.length} variação(ões)
                    </p>
                  )}

                  {owner && (
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(product)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        title={product.isActive ? "Desativar" : "Ativar"}
                        onClick={() => handleToggleActive(product)}
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
                        onConfirm={() => handleDelete(product)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        categories={categories}
        product={editingProduct}
        onSaved={loadProducts}
      />
    </AppLayout>
  )
}
