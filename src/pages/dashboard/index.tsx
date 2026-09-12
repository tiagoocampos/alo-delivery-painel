import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ListOrdered, Package, Tags, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/AppLayout"
import { api } from "@/services/api"
import { showApiError, formatPrice } from "@/lib/utils-api"
import { getStoredUser } from "@/lib/auth"
import type { Order } from "@/types"

function isToday(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const user = getStoredUser()

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

  const ordersToday = orders.filter((order) => isToday(order.createdAt))
  const newToday = ordersToday.filter((order) => order.status === "novo")
  const inProgress = orders.filter((order) => order.status === "preparo" || order.status === "transporte")
  const revenueToday = ordersToday
    .filter((order) => order.status !== "cancelado")
    .reduce((sum, order) => sum + order.total, 0)

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
      </div>
    </AppLayout>
  )
}
