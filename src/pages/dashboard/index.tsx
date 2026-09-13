import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ListOrdered, Package, Tags, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/AppLayout"
import { RevenueChart } from "@/components/RevenueChart"
import { api } from "@/services/api"
import { showApiError, formatPrice } from "@/lib/utils-api"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import type { DashboardRevenuePoint, DashboardSummary, DashboardTopProduct, Order } from "@/types"

function isToday(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatVariance(current: number, previous: number): { label: string; tone: "positive" | "negative" | "neutral" } {
  if (previous === 0) {
    return current === 0 ? { label: "—", tone: "neutral" } : { label: "Novo neste mês", tone: "positive" }
  }
  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(change))
  if (rounded === 0) return { label: "Igual ao mês passado", tone: "neutral" }
  return change > 0
    ? { label: `↑ ${rounded}% em relação ao mês passado`, tone: "positive" }
    : { label: `↓ ${rounded}% em relação ao mês passado`, tone: "negative" }
}

const VARIANCE_CLASSES: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
}

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const user = getStoredUser()
  const owner = isStoreOwner(user)

  const [monthSummary, setMonthSummary] = useState<DashboardSummary | null>(null)
  const [revenueSeries, setRevenueSeries] = useState<DashboardRevenuePoint[]>([])
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([])
  const [monthlyLoading, setMonthlyLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const response = await api.get<Order[]>("/orders")
        if (active) setOrders(response.data)
      } catch (error) {
        showApiError(error, "Erro ao carregar pedidos")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!owner) {
      setMonthlyLoading(false)
      return
    }
    let active = true
    async function loadMonthly() {
      try {
        setMonthlyLoading(true)
        const [summaryRes, revenueRes, topProductsRes] = await Promise.all([
          api.get<DashboardSummary>("/dashboard/summary"),
          api.get<DashboardRevenuePoint[]>("/dashboard/revenue", { params: { days: 30 } }),
          api.get<DashboardTopProduct[]>("/dashboard/top-products", { params: { days: 30, limit: 5 } }),
        ])
        if (active) {
          setMonthSummary(summaryRes.data)
          setRevenueSeries(revenueRes.data)
          setTopProducts(topProductsRes.data)
        }
      } catch (error) {
        showApiError(error, "Erro ao carregar o dashboard mensal")
      } finally {
        if (active) setMonthlyLoading(false)
      }
    }
    loadMonthly()
    return () => {
      active = false
    }
  }, [owner])

  const ordersToday = orders.filter((order) => isToday(order.createdAt))
  const newToday = ordersToday.filter((order) => order.status === "novo")
  const inProgress = orders.filter((order) => order.status === "preparo" || order.status === "transporte")
  const revenueToday = ordersToday
    .filter((order) => order.status !== "cancelado")
    .reduce((sum, order) => sum + order.total, 0)

  const hasRevenueInPeriod = revenueSeries.some((point) => point.totalRevenue > 0)
  const revenueVariance = monthSummary
    ? formatVariance(monthSummary.currentMonth.totalRevenue, monthSummary.previousMonth.totalRevenue)
    : null
  const ordersVariance = monthSummary
    ? formatVariance(monthSummary.currentMonth.totalOrders, monthSummary.previousMonth.totalOrders)
    : null

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Olá{user ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Resumo rápido da sua loja hoje.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos novos hoje</CardTitle>
                <ListOrdered className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{newToday.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em andamento</CardTitle>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{inProgress.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos hoje</CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{ordersToday.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento hoje</CardTitle>
                <Tags className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatPrice(revenueToday)}</CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to="/pedidos"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Ver pedidos
          </Link>
          <Link
            to="/cardapio"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Gerenciar cardápio
          </Link>
        </div>

        {owner && (
          <div className="flex flex-col gap-4 border-t border-border pt-6">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Dashboard mensal</h2>
              <p className="text-sm text-muted-foreground">Desempenho da loja no mês atual e nos últimos 30 dias.</p>
            </div>

            {monthlyLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              monthSummary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Faturamento do mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold text-foreground">
                        {formatPrice(monthSummary.currentMonth.totalRevenue)}
                      </p>
                      {revenueVariance && (
                        <p className={`text-xs font-medium ${VARIANCE_CLASSES[revenueVariance.tone]}`}>
                          {revenueVariance.label}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Pedidos do mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold text-foreground">
                        {monthSummary.currentMonth.totalOrders}
                      </p>
                      {ordersVariance && (
                        <p className={`text-xs font-medium ${VARIANCE_CLASSES[ordersVariance.tone]}`}>
                          {ordersVariance.label}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Faturamento — últimos 30 dias</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : hasRevenueInPeriod ? (
                    <RevenueChart data={revenueSeries} />
                  ) : (
                    <p className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
                      Nenhum pedido registrado ainda neste período.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mais pedidos — últimos 30 dias</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pedido registrado ainda neste período.</p>
                  ) : (
                    <ol className="flex flex-col gap-2.5">
                      {topProducts.map((product, index) => (
                        <li key={product.productId} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-foreground">
                            <span className="text-muted-foreground">{index + 1}.</span> {product.productName}
                          </span>
                          <span className="shrink-0 font-medium text-foreground">{product.totalQuantity}x</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
