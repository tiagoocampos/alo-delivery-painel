import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AppLayout } from "@/components/AppLayout"
import { OrderCard } from "@/components/OrderCard"
import { OrderDetailSheet } from "@/components/OrderDetailSheet"
import { OrdersTable } from "@/components/OrdersTable"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { api } from "@/services/api"
import { getMyTenant } from "@/services/tenant"
import { showApiError, formatPrice, getTodayDateOnly } from "@/lib/utils-api"
import { isStoreOpenNow } from "@/lib/businessHours"
import type { BusinessHourEntry, Order, OrdersSummary, OrderStatus, UpdateOrderStatusResult } from "@/types"

const POLL_INTERVAL_MS = 15_000
const STORE_OPEN_CHECK_INTERVAL_MS = 60_000
const VIEW_MODE_STORAGE_KEY = "pedidosViewMode"

type ViewMode = "board" | "table"

function getStoredViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  return stored === "table" ? "table" : "board"
}

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
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode)

  const [businessHours, setBusinessHours] = useState<BusinessHourEntry[] | null>(null)
  const [storeOpen, setStoreOpen] = useState(true)

  const detailOrder = orders.find((order) => order.id === detailOrderId) ?? null

  async function loadOrders(forDate: string, options?: { silent?: boolean }) {
    try {
      if (!options?.silent) setLoading(true)
      const [ordersRes, summaryRes] = await Promise.all([
        api.get<Order[]>("/orders", { params: { date: forDate } }),
        api.get<OrdersSummary>("/orders/summary", { params: { date: forDate } }),
      ])
      setOrders(ordersRes.data)
      setSummary(summaryRes.data)
    } catch (error) {
      // Falhas na atualização automática em segundo plano não geram toast —
      // repetir o erro a cada 15s seria muito incômodo. Erros no carregamento
      // inicial (ou ao trocar de data) continuam avisando normalmente.
      if (options?.silent) {
        console.error(error)
      } else {
        showApiError(error, "Erro ao carregar pedidos")
      }
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders(date)
  }, [date])

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Busca o horário de funcionamento uma vez — usado só para decidir se o
  // polling automático deve estar ligado ou desligado.
  useEffect(() => {
    getMyTenant()
      .then((response) => setBusinessHours(response.data.businessHours))
      .catch((error) => showApiError(error, "Erro ao carregar horário de funcionamento"))
  }, [])

  // Vigia: reavalia a cada minuto se a loja está aberta agora, ligando/desligando
  // o polling sozinho nos horários de abertura/fechamento, sem precisar recarregar.
  useEffect(() => {
    const check = () => setStoreOpen(isStoreOpenNow(businessHours))
    check()
    const watcher = setInterval(check, STORE_OPEN_CHECK_INTERVAL_MS)
    return () => clearInterval(watcher)
  }, [businessHours])

  // Polling: só ativo enquanto a loja estiver marcada como aberta.
  useEffect(() => {
    if (!storeOpen) return

    const poll = setInterval(() => {
      loadOrders(date, { silent: true })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(poll)
  }, [storeOpen, date])

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

        {!storeOpen && (
          <p className="rounded-lg border border-dashed border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Loja fechada no momento — atualização automática pausada.
          </p>
        )}

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
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList>
              <TabsTrigger value="board">Quadro</TabsTrigger>
              <TabsTrigger value="table">Tabela</TabsTrigger>
            </TabsList>

            <TabsContent value="board">
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
            </TabsContent>

            <TabsContent value="table">
              <OrdersTable
                orders={orders}
                updatingId={updatingId}
                onAdvance={(order, status) => updateStatus(order, status)}
                onCancel={(order) => updateStatus(order, "cancelado")}
                onOpenDetail={(orderId) => {
                  setDetailOrderId(orderId)
                  setDetailOpen(true)
                }}
              />
            </TabsContent>
          </Tabs>
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
