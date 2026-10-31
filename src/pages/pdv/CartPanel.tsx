import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { formatPrice } from "@/lib/utils-api"
import { cartTotal, type CartLine } from "./cart"

interface CartPanelProps {
  lines: CartLine[]
  onChangeQuantity: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onClear: () => void
  onCheckout: () => void
}

export function CartPanel({ lines, onChangeQuantity, onRemove, onClear, onCheckout }: CartPanelProps) {
  const total = cartTotal(lines)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-foreground">Carrinho</h2>
        {lines.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
                Limpar
              </Button>
            }
            title="Limpar o carrinho?"
            description="Todos os itens da venda atual serão removidos."
            confirmText="Limpar"
            destructive
            onConfirm={onClear}
          />
        )}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          <ShoppingCart className="size-5" />
          Toque em um produto para adicionar.
        </div>
      ) : (
        <ul className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto lg:max-h-[calc(100vh-22rem)]">
          {lines.map((line) => (
            <li key={line.key} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{line.name}</p>
                {line.detail && <p className="truncate text-xs text-muted-foreground">{line.detail}</p>}
                <p className="text-xs text-muted-foreground">{formatPrice(line.unitPrice)} cada</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Diminuir quantidade"
                  disabled={line.quantity <= 1}
                  onClick={() => onChangeQuantity(line.key, -1)}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Aumentar quantidade"
                  onClick={() => onChangeQuantity(line.key, 1)}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              <div className="flex w-20 flex-col items-end gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {formatPrice(line.unitPrice * line.quantity)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${line.name}`}
                  onClick={() => onRemove(line.key)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Total estimado</span>
        <span className="text-2xl font-semibold text-foreground">{formatPrice(total)}</span>
      </div>

      <Button size="lg" className="h-12 w-full text-base" disabled={lines.length === 0} onClick={onCheckout}>
        Fechar venda
      </Button>
    </div>
  )
}
