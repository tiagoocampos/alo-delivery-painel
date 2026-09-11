import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AppLayout } from "@/components/AppLayout"
import { OrderCard } from "@/components/OrderCard"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { showApiError } from "@/lib/utils-api"
import type { Order, OrderStatus, UpdateOrderStatusResult } from "@/types"

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "novo", title: "Novo" },
  { status: "preparo", title: "Em preparo" },
  { status: "transporte", title: "Em transporte" },
  { status: "entregue", title: "Entregue" },
  { status: "cancelado", title: "Cancelado" },
]

export function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function loadOrders() {
    try {
      setLoading(true)
      const response = await api.get<Order[]>("/orders")
      setOrders(response.data)
    } catch (error) {
      showApiError(error, "Erro ao carregar pedidos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function updateStatus(order: Order, status: OrderStatus) {
    try {
      setUpdatingId(order.id)
      const response = await api.patch<UpdateOrderStatusResult>(`/orders/${order.id}/status`, { status })
      setOrders((current) =>
        current.map((o) => (o.id === order.id ? { ...o, status: response.data.status } : o))
      )
      if (response.data.loyalty) {
        toast.success(
          `Pedido entregue! Cliente ganhou ${response.data.loyalty.pointsEarned} ponto(s) (saldo: ${response.data.loyalty.pointsBalance}).`,
          { position: "top-center" }
        )
      } else {
        toast.success("Status do pedido atualizado!", { position: "top-center" })
      }
    } catch (error) {
      showApiError(error, "Erro ao atualizar pedido")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe e atualize o status dos pedidos em tempo real.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {COLUMNS.map((column) => {
              const columnOrders = orders.filter((order) => order.status === column.status)
              return (
                <div key={column.status} className="flex w-72 shrink-0 flex-col gap-3 lg:w-auto">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-foreground">{column.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {columnOrders.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                        Nenhum pedido
                      </p>
                    ) : (
                      columnOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          updating={updatingId === order.id}
                          onAdvance={(status) => updateStatus(order, status)}
                          onCancel={() => updateStatus(order, "cancelado")}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
