import { useState } from "react"
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
import type { ProductExtra } from "@/types"

const extraSchema = z.object({
  name: z.string().min(1, "O nome do adicional é obrigatório"),
  price: z
    .string()
    .min(1, "Informe o preço")
    .regex(/^\d+([.,]\d{1,2})?$/, "Preço inválido (ex: 5,00)"),
})

type ExtraValues = z.infer<typeof extraSchema>

interface ExtraRowProps {
  productId: string
  extra: ProductExtra
  canManage: boolean
  onUpdated: (extra: ProductExtra) => void
  onDeleted: (extraId: string) => void
}

function ExtraRow({ productId, extra, canManage, onUpdated, onDeleted }: ExtraRowProps) {
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtraValues>({
    resolver: zodResolver(extraSchema),
    defaultValues: { name: extra.name, price: centsToReais(extra.price) },
  })

  async function onSubmit(values: ExtraValues) {
    try {
      setSubmitting(true)
      const response = await api.put<ProductExtra>(`/products/${productId}/extras/${extra.id}`, {
        name: values.name,
        price: reaisToCents(values.price),
      })
      toast.success("Adicional atualizado!", { position: "top-center" })
      setEditing(false)
      onUpdated(response.data)
    } catch (error) {
      showApiError(error, "Erro ao atualizar adicional")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      await api.delete(`/products/${productId}/extras/${extra.id}`)
      toast.success("Adicional removido!", { position: "top-center" })
      onDeleted(extra.id)
    } catch (error) {
      showApiError(error, "Erro ao remover adicional")
    } finally {
      setDeleting(false)
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span>{extra.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{formatPrice(extra.price)}</span>
          {canManage && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${extra.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deleting}
                onClick={handleDelete}
                aria-label={`Remover ${extra.name}`}
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
      </div>
      {(errors.name || errors.price) && (
        <span className="text-xs text-destructive">{errors.name?.message ?? errors.price?.message}</span>
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

interface ProductExtrasProps {
  productId: string
  extras: ProductExtra[]
  canManage: boolean
  onChanged: () => void
}

export function ProductExtras({ productId, extras, canManage, onChanged }: ProductExtrasProps) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtraValues>({ resolver: zodResolver(extraSchema) })

  async function onSubmit(values: ExtraValues) {
    try {
      setSubmitting(true)
      await api.post(`/products/${productId}/extras`, {
        name: values.name,
        price: reaisToCents(values.price),
      })
      toast.success("Adicional adicionado!", { position: "top-center" })
      reset()
      onChanged()
    } catch (error) {
      showApiError(error, "Erro ao adicionar adicional")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Adicionais</Label>

      {extras.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum adicional cadastrado.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {extras.map((extra) => (
            <ExtraRow
              key={extra.id}
              productId={productId}
              extra={extra}
              canManage={canManage}
              onUpdated={onChanged}
              onDeleted={onChanged}
            />
          ))}
        </ul>
      )}

      {canManage && (
        // Nota: propositalmente um <div>, não um <form> — este componente é usado
        // dentro do <form> de ProductFormSheet, e formulários HTML não podem ser
        // aninhados (o evento de submit do interno propaga e dispara o externo).
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1">
            <Input placeholder="Nome (ex: Bacon extra)" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-28">
            <Input placeholder="Preço" {...register("price")} />
            {errors.price && <span className="text-xs text-destructive">{errors.price.message}</span>}
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={submitting}
            title="Adicionar adicional"
            onClick={handleSubmit(onSubmit)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
