import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { showApiError, formatDate } from "@/lib/utils-api"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import type { Category } from "@/types"

const categorySchema = z.object({
  name: z.string().min(1, "O nome da categoria é obrigatório"),
})

type CategoryValues = z.infer<typeof categorySchema>

export function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const owner = isStoreOwner(getStoredUser())

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema) })

  async function loadCategories() {
    try {
      setLoading(true)
      const response = await api.get<Category[]>("/categories")
      setCategories(response.data)
    } catch (error) {
      showApiError(error, "Erro ao carregar categorias")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  async function onSubmit(values: CategoryValues) {
    try {
      setSubmitting(true)
      await api.post("/categories", values)
      toast.success("Categoria criada com sucesso!", { position: "top-center" })
      reset()
      await loadCategories()
    } catch (error) {
      showApiError(error, "Erro ao criar categoria")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize o cardápio da sua loja em categorias.</p>
        </div>

        {owner && (
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="name">Nova categoria</Label>
                  <Input id="name" placeholder="Ex: Lanches" {...register("name")} />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </div>
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Criada em {formatDate(category.createdAt)}
                    </p>
                  </div>
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
