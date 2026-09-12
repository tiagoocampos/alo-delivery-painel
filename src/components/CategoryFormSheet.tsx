import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { showApiError } from "@/lib/utils-api"
import type { Category } from "@/types"

const categoryNameSchema = z.object({
  name: z.string().min(1, "O nome da categoria é obrigatório"),
})

type CategoryNameValues = z.infer<typeof categoryNameSchema>

interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null // null = criando categoria nova
  onSaved: () => void
}

export function CategoryFormSheet({ open, onOpenChange, category, onSaved }: CategoryFormSheetProps) {
  const isEdit = Boolean(category)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryNameValues>({ resolver: zodResolver(categoryNameSchema) })

  useEffect(() => {
    if (!open) return
    reset({ name: category?.name ?? "" })
  }, [open, category, reset])

  async function onSubmit(values: CategoryNameValues) {
    try {
      setSubmitting(true)
      if (isEdit && category) {
        await api.put(`/categories/${category.id}`, { name: values.name })
        toast.success("Categoria atualizada!", { position: "top-center" })
      } else {
        await api.post("/categories", { name: values.name })
        toast.success("Categoria criada!", { position: "top-center" })
      }
      onSaved()
      onOpenChange(false)
    } catch (error) {
      showApiError(error, isEdit ? "Erro ao atualizar categoria" : "Erro ao criar categoria")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Atualize o nome da categoria." : "Dê um nome para a nova categoria do cardápio."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryName">Nome</Label>
            <Input id="categoryName" placeholder="Ex: Pizzas" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
