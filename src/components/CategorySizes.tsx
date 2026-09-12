import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { showApiError, formatPrice, reaisToCents, centsToReais } from "@/lib/utils-api"
import type { CategorySize } from "@/types"

const sizeSchema = z.object({
  name: z.string().min(1, "O nome do tamanho é obrigatório"),
  price: z
    .string()
    .min(1, "Informe o preço")
    .regex(/^\d+([.,]\d{1,2})?$/, "Preço inválido (ex: 35,00)"),
  maxFlavors: z
    .string()
    .min(1, "Informe quantos sabores permite")
    .regex(/^\d+$/, "Deve ser um número inteiro"),
})

type SizeValues = z.infer<typeof sizeSchema>

interface SizeRowProps {
  categoryId: string
  size: CategorySize
  canManage: boolean
  onUpdated: (size: CategorySize) => void
  onDeleted: (sizeId: string) => void
}

function SizeRow({ categoryId, size, canManage, onUpdated, onDeleted }: SizeRowProps) {
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SizeValues>({
    resolver: zodResolver(sizeSchema),
    defaultValues: {
      name: size.name,
      price: centsToReais(size.price),
      maxFlavors: String(size.maxFlavors),
    },
  })

  async function onSubmit(values: SizeValues) {
    try {
      setSubmitting(true)
      const response = await api.put<CategorySize>(`/categories/${categoryId}/sizes/${size.id}`, {
        name: values.name,
        price: reaisToCents(values.price),
        maxFlavors: parseInt(values.maxFlavors, 10),
      })
      toast.success("Tamanho atualizado!", { position: "top-center" })
      setEditing(false)
      onUpdated(response.data)
    } catch (error) {
      showApiError(error, "Erro ao atualizar tamanho")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      await api.delete(`/categories/${categoryId}/sizes/${size.id}`)
      toast.success("Tamanho removido!", { position: "top-center" })
      onDeleted(size.id)
    } catch (error) {
      showApiError(error, "Erro ao remover tamanho")
    } finally {
      setDeleting(false)
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span>
          {size.name}
          <span className="text-muted-foreground"> · até {size.maxFlavors} sabor(es)</span>
        </span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{formatPrice(size.price)}</span>
          {canManage && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${size.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deleting}
                onClick={handleDelete}
                aria-label={`Remover ${size.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Nome" {...register("name")} />
        <Input placeholder="Preço" className="sm:w-28" {...register("price")} />
        <Input placeholder="Sabores" className="sm:w-24" {...register("maxFlavors")} />
      </div>
      {(errors.name || errors.price || errors.maxFlavors) && (
        <span className="text-xs text-destructive">
          {errors.name?.message ?? errors.price?.message ?? errors.maxFlavors?.message}
        </span>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={submitting} onClick={handleSubmit(onSubmit)}>
          Salvar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(false)
            reset()
          }}
        >
          Cancelar
        </Button>
      </div>
    </li>
  )
}

interface CategorySizesProps {
  categoryId: string
  sizes: CategorySize[]
  canManage: boolean
  onChanged: () => void
}

export function CategorySizes({ categoryId, sizes: initialSizes, canManage, onChanged }: CategorySizesProps) {
  const [sizes, setSizes] = useState<CategorySize[]>(initialSizes)
  const [submitting, setSubmitting] = useState(false)

  // Sincroniza a lista local só quando a categoria muda (troca de aba/sheet).
  // Não reagimos a toda mudança de `initialSizes`: hoje o GET /categories não
  // retorna sizes/crusts, então um refetch do pai sempre traria [] de volta e
  // apagaria da tela o que acabou de ser criado/editado aqui.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSizes(initialSizes)
  }, [categoryId])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SizeValues>({ resolver: zodResolver(sizeSchema) })

  async function onSubmit(values: SizeValues) {
    try {
      setSubmitting(true)
      const response = await api.post<CategorySize>(`/categories/${categoryId}/sizes`, {
        name: values.name,
        price: reaisToCents(values.price),
        maxFlavors: parseInt(values.maxFlavors, 10),
      })
      toast.success("Tamanho adicionado!", { position: "top-center" })
      reset()
      setSizes((current) => [...current, response.data])
      onChanged()
    } catch (error) {
      showApiError(error, "Erro ao adicionar tamanho")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Tamanhos</Label>
      <p className="text-xs text-muted-foreground">
        Ao cadastrar um tamanho, os produtos desta categoria passam a ser "sabores": sem preço próprio — o
        preço vem do tamanho escolhido pelo cliente.
      </p>

      {sizes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum tamanho cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sizes.map((size) => (
            <SizeRow
              key={size.id}
              categoryId={categoryId}
              size={size}
              canManage={canManage}
              onUpdated={(updated) => {
                setSizes((current) => current.map((s) => (s.id === updated.id ? updated : s)))
                onChanged()
              }}
              onDeleted={(sizeId) => {
                setSizes((current) => current.filter((s) => s.id !== sizeId))
                onChanged()
              }}
            />
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1">
            <Input placeholder="Nome (ex: Grande)" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-28">
            <Input placeholder="Preço" {...register("price")} />
            {errors.price && <span className="text-xs text-destructive">{errors.price.message}</span>}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-24">
            <Input placeholder="Sabores" {...register("maxFlavors")} />
            {errors.maxFlavors && <span className="text-xs text-destructive">{errors.maxFlavors.message}</span>}
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={submitting}
            title="Adicionar tamanho"
            onClick={handleSubmit(onSubmit)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
