import { Phone } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { OrderItemLine } from "@/components/OrderItemLine"
import { OrderStatusBadge } from "@/components/OrderStatusBadge"
import { formatDate, formatPrice } from "@/lib/utils-api"
import { canCancelOrder, getNextOrderAction } from "@/lib/orderStatus"
import type { Order, OrderStatus } from "@/types"

const PAYMENT_LABELS: Record<string, string> = {
  pix_manual: "Pix",
  na_entrega: "Na entrega",
}

interface OrderDetailSheetProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdvance: (status: OrderStatus) => void
  onCancel: () => void
  updating: boolean
}

export function OrderDetailSheet({ order, open, onOpenChange, onAdvance, onCancel, updating }: OrderDetailSheetProps) {
  const nextAction = order ? getNextOrderAction(order.status) : null
  const canCancel = Boolean(order && canCancelOrder(order.status))
  const canceledByCustomer = Boolean(order && order.status === "cancelado" && order.canceledBy === "customer")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {order && (
          <>
            <SheetHeader>
              <SheetTitle>Pedido de {order.customerName}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span>{formatDate(order.createdAt)}</span>
                <OrderStatusBadge status={order.status} />
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              {canceledByCustomer && (
                <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2">
                  <Badge variant="destructive" className="w-fit">
                    Cancelado pelo cliente
                  </Badge>
                  {order.cancelReason && (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Motivo:</span> {order.cancelReason}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Cliente</p>
                <p className="text-sm text-foreground">{order.customerName}</p>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="flex w-fit items-center gap-1.5 text-sm text-foreground hover:underline"
                >
                  <Phone className="size-3.5" />
                  {order.customerPhone}
                </a>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Endereço de entrega</p>
                <p className="text-sm text-foreground">{order.address}</p>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground">Itens do pedido</p>
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <OrderItemLine item={item} />
                    <span className="shrink-0 text-sm text-muted-foreground">{formatPrice(item.unitPrice)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <span className="text-foreground">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="text-foreground">{formatPrice(order.deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {(nextAction || canCancel) && (
              <SheetFooter className="flex-col gap-2">
                {nextAction && (
                  <Button disabled={updating} onClick={() => onAdvance(nextAction.status)} className="w-full">
                    {nextAction.label}
                  </Button>
                )}
                {canCancel && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="destructive" disabled={updating} className="w-full">
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
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
