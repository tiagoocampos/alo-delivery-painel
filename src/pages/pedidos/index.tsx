import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AppLayout } from "@/components/AppLayout"
import { OrderCard } from "@/components/OrderCard"
import { OrderDetailSheet } from "@/components/OrderDetailSheet"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { showApiError, formatPrice, getTodayDateOnly } from "@/lib/utils-api"
import type { Order, OrdersSummary, OrderStatus, UpdateOrderStatusResult } from "@/types"

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "novo", title: "Novo" },
  { status: "preparo", title: "Em preparo" },
  { status: "transporte", title: "Em transporte" },
  { status: "entregue", title: "Entregue" },
  { status: "cancelado", title: "Cancelado" },
]

export function PedidosPage() {
  const [date, setDate] = useState(getTodayDateOnly())
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<OrdersSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const detailOrder = orders.find((order) => order.id === detailOrderId) ?? null

  async function loadOrders(forDate: string) {
    try {
      setLoading(true)
      const [ordersRes, summaryRes] = await Promise.all([
        api.get<Order[]>("/orders", { params: { date: forDate } }),
        api.get<OrdersSummary>("/orders/summary", { params: { date: forDate } }),
      ])
      setOrders(ordersRes.data)
      setSummary(summaryRes.data)
    } catch (error) {
      showApiError(error, "Erro ao carregar pedidos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(date)
  }, [date])

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">Pedidos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe e atualize o status dos pedidos em tempo real.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orderDate">Data</Label>
            <Input
              id="orderDate"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="sm:w-44"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Pedidos no dia</p>
                  <p className="text-2xl font-semibold text-foreground">{summary.totalOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Faturamento do dia</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPrice(summary.totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Ticket médio</p>
                  <p className="text-2xl font-semibold text-foreground">{formatPrice(summary.averageTicket)}</p>
                </CardContent>
              </Card>
            </div>
          )
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-4 sm:overflow-x-auto sm:pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
            {COLUMNS.map((column) => {
              const columnOrders = orders.filter((order) => order.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-3 sm:w-72 sm:shrink-0 lg:w-auto">
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
                          onOpenDetail={() => {
                            setDetailOrderId(order.id)
                            setDetailOpen(true)
                          }}
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

      <OrderDetailSheet
        order={detailOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        updating={updatingId === detailOrder?.id}
        onAdvance={(status) => detailOrder && updateStatus(detailOrder, status)}
        onCancel={() => detailOrder && updateStatus(detailOrder, "cancelado")}
      />
    </AppLayout>
  )
}
