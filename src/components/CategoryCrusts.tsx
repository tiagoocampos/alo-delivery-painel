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
import type { CategoryCrust } from "@/types"

const crustSchema = z.object({
  name: z.string().min(1, "O nome da borda é obrigatório"),
  priceDelta: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido (ex: 8,00)")
    .optional()
    .or(z.literal("")),
})

type CrustValues = z.infer<typeof crustSchema>

interface CrustRowProps {
  categoryId: string
  crust: CategoryCrust
  canManage: boolean
  onUpdated: (crust: CategoryCrust) => void
  onDeleted: (crustId: string) => void
}

function CrustRow({ categoryId, crust, canManage, onUpdated, onDeleted }: CrustRowProps) {
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrustValues>({
    resolver: zodResolver(crustSchema),
    defaultValues: { name: crust.name, priceDelta: centsToReais(crust.priceDelta) },
  })

  async function onSubmit(values: CrustValues) {
    try {
      setSubmitting(true)
      const priceDelta = values.priceDelta ? reaisToCents(values.priceDelta) : 0
      const response = await api.put<CategoryCrust>(`/categories/${categoryId}/crusts/${crust.id}`, {
        name: values.name,
        priceDelta,
      })
      toast.success("Borda atualizada!", { position: "top-center" })
      setEditing(false)
      onUpdated(response.data)
    } catch (error) {
      showApiError(error, "Erro ao atualizar borda")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)
      await api.delete(`/categories/${categoryId}/crusts/${crust.id}`)
      toast.success("Borda removida!", { position: "top-center" })
      onDeleted(crust.id)
    } catch (error) {
      showApiError(error, "Erro ao remover borda")
    } finally {
      setDeleting(false)
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <span>{crust.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">
            {crust.priceDelta > 0 ? `+${formatPrice(crust.priceDelta)}` : "Sem custo"}
          </span>
          {canManage && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${crust.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deleting}
                onClick={handleDelete}
                aria-label={`Remover ${crust.name}`}
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
        <Input placeholder="+ preço" className="sm:w-28" {...register("priceDelta")} />
      </div>
      {(errors.name || errors.priceDelta) && (
        <span className="text-xs text-destructive">{errors.name?.message ?? errors.priceDelta?.message}</span>
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

interface CategoryCrustsProps {
  categoryId: string
  crusts: CategoryCrust[]
  canManage: boolean
  onChanged: () => void
}

export function CategoryCrusts({ categoryId, crusts: initialCrusts, canManage, onChanged }: CategoryCrustsProps) {
  const [crusts, setCrusts] = useState<CategoryCrust[]>(initialCrusts)
  const [submitting, setSubmitting] = useState(false)

  // Mesmo motivo do CategorySizes: GET /categories ainda não retorna
  // sizes/crusts, então só ressincronizamos ao trocar de categoria — nunca a
  // cada refetch do pai, ou perderíamos o que acabou de ser criado/editado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setCrusts(initialCrusts)
  }, [categoryId])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CrustValues>({ resolver: zodResolver(crustSchema) })

  async function onSubmit(values: CrustValues) {
    try {
      setSubmitting(true)
      const priceDelta = values.priceDelta ? reaisToCents(values.priceDelta) : 0
      const response = await api.post<CategoryCrust>(`/categories/${categoryId}/crusts`, {
        name: values.name,
        priceDelta,
      })
      toast.success("Borda adicionada!", { position: "top-center" })
      reset()
      setCrusts((current) => [...current, response.data])
      onChanged()
    } catch (error) {
      showApiError(error, "Erro ao adicionar borda")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Bordas</Label>
      <p className="text-xs text-muted-foreground">
        Opção única e independente do tamanho. Deixe o preço em branco (ou 0) para uma opção sem custo extra.
      </p>

      {crusts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma borda cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {crusts.map((crust) => (
            <CrustRow
              key={crust.id}
              categoryId={categoryId}
              crust={crust}
              canManage={canManage}
              onUpdated={(updated) => {
                setCrusts((current) => current.map((c) => (c.id === updated.id ? updated : c)))
                onChanged()
              }}
              onDeleted={(crustId) => {
                setCrusts((current) => current.filter((c) => c.id !== crustId))
                onChanged()
              }}
            />
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1">
            <Input placeholder="Nome (ex: Borda de catupiry)" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-32">
            <Input placeholder="+ preço" {...register("priceDelta")} />
            {errors.priceDelta && <span className="text-xs text-destructive">{errors.priceDelta.message}</span>}
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={submitting}
            title="Adicionar borda"
            onClick={handleSubmit(onSubmit)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
