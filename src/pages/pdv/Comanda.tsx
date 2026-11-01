import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatPrice } from "@/lib/utils-api"
import type { PosTableDetail } from "@/types"

interface ComandaProps {
  table: PosTableDetail
  busyItemIds: Set<string>
  canCancel: boolean
  onChangeQuantity: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
  onClose: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function Comanda({
  table,
  busyItemIds,
  canCancel,
  onChangeQuantity,
  onRemove,
  onClose,
  onDiscard,
  onCancel,
}: ComandaProps) {
  const empty = table.items.length === 0

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-base font-semibold text-foreground">Comanda — {table.label}</h2>

      {empty ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum item lançado. Toque em um produto.
        </p>
      ) : (
        <ul className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto lg:max-h-[calc(100vh-24rem)]">
          {table.items.map((item) => {
            const busy = busyItemIds.has(item.id)
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  {item.extras.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.extras.map((extra) => `+ ${extra.name}`).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice)} cada</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Diminuir quantidade"
                    disabled={busy || item.quantity <= 1}
                    onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Aumentar quantidade"
                    disabled={busy || item.quantity >= 99}
                    onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                <div className="flex w-20 flex-col items-end gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Remover ${item.name}`} disabled={busy}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    }
                    title={`Remover ${item.name}?`}
                    description="O item será retirado da comanda."
                    confirmText="Remover"
                    destructive
                    onConfirm={() => onRemove(item.id)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-end justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-2xl font-semibold text-foreground">{formatPrice(table.total)}</span>
      </div>

      <Button size="lg" className="h-12 w-full text-base" disabled={empty} onClick={onClose}>
        Fechar conta
      </Button>

      {empty && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="w-full">
              Descartar mesa
            </Button>
          }
          title="Descartar mesa?"
          description={`${table.label} está vazia e será removida.`}
          confirmText="Descartar"
          destructive
          onConfirm={onDiscard}
        />
      )}

      {!empty && canCancel && (
        <Button variant="outline" className="w-full text-destructive" onClick={onCancel}>
          Cancelar mesa
        </Button>
      )}
    </div>
  )
}
