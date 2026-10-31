import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancelPosSale, listPosSales } from "@/services/pos"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { formatPrice, getApiErrorMessage, getTodayDateOnly } from "@/lib/utils-api"
import type { PosPaymentMethod, PosSale, PosSalesResponse } from "@/types"
import { PAYMENT_LABELS } from "./PaymentDialog"

const SHORT_PAYMENT_LABELS: Record<PosPaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Débito",
  cartao_credito: "Crédito",
}

function isCanceled(sale: PosSale) {
  return sale.status.toLowerCase().startsWith("cancel") || Boolean(sale.cancelReason)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function summarizeItems(sale: PosSale) {
  return sale.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")
}

export function VendasDoDia() {
  const owner = isStoreOwner(getStoredUser())
  const [date, setDate] = useState(getTodayDateOnly())
  const [data, setData] = useState<PosSalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [saleToCancel, setSaleToCancel] = useState<PosSale | null>(null)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const response = await listPosSales(date)
      setData(response.data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  function askCancel(sale: PosSale) {
    setReason("")
    setReasonError("")
    setSaleToCancel(sale)
  }

  function handleConfirmCancel() {
    if (!saleToCancel) return
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError("Informe o motivo do cancelamento")
      return
    }
    void doCancel(saleToCancel, trimmed)
  }

  async function doCancel(sale: PosSale, trimmedReason: string) {
    try {
      setCanceling(true)
      await cancelPosSale(sale.id, trimmedReason)
      toast.success("Venda cancelada", { position: "top-center" })
      setSaleToCancel(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Erro ao cancelar a venda"), { position: "top-center" })
    } finally {
      setCanceling(false)
    }
  }

  const sales = data ? [...data.sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:w-48">
        <Label htmlFor="pos-date">Data</Label>
        <Input
          id="pos-date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as vendas.</p>
          <Button variant="outline" onClick={load}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total vendido</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{formatPrice(data.summary.totalRevenue)}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{data.summary.totalSales}</CardContent>
              </Card>
              {(Object.keys(SHORT_PAYMENT_LABELS) as PosPaymentMethod[]).map((method) => {
                const entry = data.summary.byPaymentMethod.find((item) => item.paymentMethod === method)
                return (
                  <Card key={method}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {SHORT_PAYMENT_LABELS[method]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col">
                      <span className="text-xl font-semibold">{formatPrice(entry?.total ?? 0)}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry?.count ?? 0} {(entry?.count ?? 0) === 1 ? "venda" : "vendas"}
                      </span>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {sales.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhuma venda de balcão nesta data.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sales.map((sale) => {
                  const canceled = isCanceled(sale)
                  return (
                    <li key={sale.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                      <span className="w-12 shrink-0 text-sm font-medium text-foreground">
                        {formatTime(sale.createdAt)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm text-foreground", canceled && "line-through opacity-60")}>
                          {summarizeItems(sale)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">{PAYMENT_LABELS[sale.paymentMethod]}</Badge>
                          {canceled && <Badge variant="destructive">Cancelada</Badge>}
                        </div>
                        {canceled && sale.cancelReason && (
                          <p className="mt-1 text-xs text-muted-foreground">Motivo: {sale.cancelReason}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("text-sm font-semibold", canceled && "line-through opacity-60")}>
                          {formatPrice(sale.total)}
                        </span>
                        {owner && !canceled && (
                          <Button variant="outline" size="sm" onClick={() => askCancel(sale)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )
      )}

      <Dialog open={saleToCancel !== null} onOpenChange={(open) => !open && !canceling && setSaleToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar venda?</DialogTitle>
            <DialogDescription>
              {saleToCancel
                ? `Venda de ${formatPrice(saleToCancel.total)} às ${formatTime(saleToCancel.createdAt)}. Ela sairá do resumo do dia.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleConfirmCancel()
            }}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel-reason">Motivo (obrigatório)</Label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setReasonError("")
                }}
                maxLength={200}
              />
              {reasonError && <span className="text-xs text-destructive">{reasonError}</span>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={canceling} onClick={() => setSaleToCancel(null)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={canceling}>
                {canceling ? "Cancelando..." : "Cancelar venda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
