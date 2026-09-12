import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { OrderItemLine } from "@/components/OrderItemLine"
import { formatDate, formatPrice } from "@/lib/utils-api"
import type { Order, OrderStatus } from "@/types"

const PAYMENT_LABELS: Record<string, string> = {
  pix_manual: "Pix",
  na_entrega: "Na entrega",
}

interface OrderCardProps {
  order: Order
  onAdvance: (status: OrderStatus) => void
  onCancel: () => void
  onOpenDetail: () => void
  updating: boolean
}

export function OrderCard({ order, onAdvance, onCancel, onOpenDetail, updating }: OrderCardProps) {
  const nextAction: { label: string; status: OrderStatus } | null =
    order.status === "novo"
      ? { label: "Iniciar preparo", status: "preparo" }
      : order.status === "preparo"
        ? { label: "Saiu para entrega", status: "transporte" }
        : order.status === "transporte"
          ? { label: "Marcar como entregue", status: "entregue" }
          : null

  const canCancel = order.status === "novo" || order.status === "preparo" || order.status === "transporte"

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetail}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onOpenDetail()
            }
          }}
          className="-m-1 flex cursor-pointer flex-col gap-2 rounded-md p-1 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{order.customerName}</p>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
          </div>

          {order.items.length > 0 && (
            <div className="flex flex-col gap-1">
              {order.items.map((item) => (
                <OrderItemLine key={item.id} item={item} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
            <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
          </div>
        </div>

        {(nextAction || canCancel) && (
          <div className="mt-1 flex flex-col gap-1.5">
            {nextAction && (
              <Button size="sm" disabled={updating} onClick={() => onAdvance(nextAction.status)}>
                {nextAction.label}
              </Button>
            )}
            {canCancel && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="destructive" disabled={updating}>
                    Cancelar pedido
                  </Button>
                }
                title="Cancelar pedido?"
                description={`O pedido de ${order.customerName} será marcado como cancelado. Essa ação não pode ser desfeita.`}
                confirmText="Cancelar pedido"
                destructive
                onConfirm={onCancel}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
