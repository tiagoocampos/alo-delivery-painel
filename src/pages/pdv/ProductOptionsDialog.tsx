import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatPrice } from "@/lib/utils-api"
import type { Product } from "@/types"
import { buildProductLine, computeUnitPrice, type CartLine } from "./cart"

interface ProductOptionsDialogProps {
  product: Product | null
  onClose: () => void
  onAdd: (line: CartLine) => void
  actionLabel?: string
}

export function ProductOptionsDialog({ product, onClose, onAdd, actionLabel = "Adicionar" }: ProductOptionsDialogProps) {
  const [variantId, setVariantId] = useState("")
  const [extraIds, setExtraIds] = useState<string[]>([])

  useEffect(() => {
    setVariantId("")
    setExtraIds([])
  }, [product])

  if (!product) return null

  const variant = product.variants.find((item) => item.id === variantId) ?? null
  const extras = product.extras.filter((extra) => extraIds.includes(extra.id))
  const needsVariant = product.variants.length > 0 && !variant
  const price = computeUnitPrice(product, variant, extras)

  function toggleExtra(id: string) {
    setExtraIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function handleAdd() {
    if (!product || needsVariant) return
    onAdd(buildProductLine(product, variant, extras))
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Escolha as opções do item.</DialogDescription>
        </DialogHeader>

        {product.variants.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Variação (obrigatória)</legend>
            {product.variants.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="variant"
                  className="accent-primary"
                  checked={variantId === item.id}
                  onChange={() => setVariantId(item.id)}
                />
                <span className="flex-1">{item.name}</span>
                {item.priceDelta !== 0 && (
                  <span className="text-xs text-muted-foreground">
                    {item.priceDelta > 0 ? "+ " : "- "}
                    {formatPrice(Math.abs(item.priceDelta))}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
        )}

        {product.extras.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">Extras</legend>
            {product.extras.map((extra) => (
              <Label
                key={extra.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 font-normal has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={extraIds.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                />
                <span className="flex-1">{extra.name}</span>
                <span className="text-xs text-muted-foreground">+ {formatPrice(extra.price)}</span>
              </Label>
            ))}
          </fieldset>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-lg font-semibold text-foreground">{formatPrice(price)}</span>
          <Button disabled={needsVariant} onClick={handleAdd}>
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
