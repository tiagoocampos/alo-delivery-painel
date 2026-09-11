import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { showApiError, formatPrice, reaisToCents } from "@/lib/utils-api"
import type { ProductVariant } from "@/types"

const variantSchema = z.object({
  name: z.string().min(1, "O nome da variação é obrigatório"),
  priceDelta: z
    .string()
    .regex(/^-?\d+([.,]\d{1,2})?$/, "Valor inválido (ex: 5,00 ou -5,00)")
    .optional()
    .or(z.literal("")),
})

type VariantValues = z.infer<typeof variantSchema>

interface ProductVariantsProps {
  productId: string
  variants: ProductVariant[]
  canManage: boolean
  onChanged: () => void
}

export function ProductVariants({ productId, variants, canManage, onChanged }: ProductVariantsProps) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantValues>({ resolver: zodResolver(variantSchema) })

  async function onSubmit(values: VariantValues) {
    try {
      setSubmitting(true)
      const priceDelta = values.priceDelta ? reaisToCents(values.priceDelta) : 0
      await api.post(`/products/${productId}/variants`, {
        name: values.name,
        priceDelta,
      })
      toast.success("Variação adicionada!", { position: "top-center" })
      reset()
      onChanged()
    } catch (error) {
      showApiError(error, "Erro ao adicionar variação")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Variações</Label>

      {variants.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma variação cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>{variant.name}</span>
              <span className="text-muted-foreground">
                {variant.priceDelta >= 0 ? "+" : ""}
                {formatPrice(variant.priceDelta)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-1">
            <Input placeholder="Nome (ex: Tamanho G)" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-32">
            <Input placeholder="+/- preço" {...register("priceDelta")} />
            {errors.priceDelta && <span className="text-xs text-destructive">{errors.priceDelta.message}</span>}
          </div>
          <Button type="submit" size="icon" variant="outline" disabled={submitting} title="Adicionar variação">
            <Plus className="size-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
