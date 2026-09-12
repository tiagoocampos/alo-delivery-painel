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
import { updateMyTenantName } from "@/services/tenant"
import { showApiError } from "@/lib/utils-api"
import type { Tenant } from "@/types"

const storeSettingsSchema = z.object({
  name: z.string().min(1, "O nome da loja é obrigatório"),
})

type StoreSettingsValues = z.infer<typeof storeSettingsSchema>

interface StoreSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
  onSaved: (tenant: Tenant) => void
}

export function StoreSettingsSheet({ open, onOpenChange, tenant, onSaved }: StoreSettingsSheetProps) {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StoreSettingsValues>({ resolver: zodResolver(storeSettingsSchema) })

  useEffect(() => {
    if (!open) return
    reset({ name: tenant?.name ?? "" })
  }, [open, tenant, reset])

  async function onSubmit(values: StoreSettingsValues) {
    try {
      setSubmitting(true)
      const response = await updateMyTenantName(values.name)
      toast.success("Nome da loja atualizado!", { position: "top-center" })
      onSaved(response.data)
      onOpenChange(false)
    } catch (error) {
      showApiError(error, "Erro ao atualizar o nome da loja")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurações da loja</SheetTitle>
          <SheetDescription>Altere o nome exibido para os seus clientes.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="storeName">Nome da loja</Label>
            <Input id="storeName" placeholder="Ex: X-Salada do Zé" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
