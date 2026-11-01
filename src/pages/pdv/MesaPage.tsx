import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axios from "axios"
import { toast } from "sonner"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { PlanoBasicoNotice } from "@/components/PlanoBasicoNotice"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTenant } from "@/contexts/TenantContext"
import {
  addPosTableItem,
  cancelPosTable,
  closePosTable,
  discardPosTable,
  getPosTable,
  removePosTableItem,
  updatePosTableItem,
} from "@/services/pos"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import { formatPrice, getApiErrorMessage } from "@/lib/utils-api"
import type { PosPaymentMethod, PosTableDetail } from "@/types"
import { lineToApiItem, type CartLine } from "./cart"
import { Comanda } from "./Comanda"
import { PaymentDialog } from "./PaymentDialog"
import { ProductPicker } from "./ProductPicker"
import { ReasonDialog } from "./ReasonDialog"

function isTableOpen(table: PosTableDetail) {
  return table.status === "aberta"
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function MesaPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const owner = isStoreOwner(getStoredUser())

  const [table, setTable] = useState<PosTableDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(new Set())
  const [comandaSheetOpen, setComandaSheetOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  // Lançamentos em fila: respostas chegam na ordem em que foram pedidas,
  // então o total exibido nunca volta para um estado antigo.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const closingRef = useRef(false)

  const leave = useCallback(
    (message: string) => {
      toast.info(message, { position: "top-center" })
      navigate("/pdv", { replace: true })
    },
    [navigate]
  )

  const load = useCallback(async () => {
    try {
      const response = await getPosTable(id)
      if (!isTableOpen(response.data)) {
        leave("Essa mesa não está mais aberta")
        return
      }
      setTable(response.data)
      setLoadError(false)
    } catch (error) {
      if (axios.isAxiosError(error) && [404, 409, 422].includes(error.response?.status ?? 0)) {
        leave("Essa mesa não está mais aberta")
        return
      }
      setLoadError(true)
    }
  }, [id, leave])

  useEffect(() => {
    if (tenant?.effectivePlan === "basico") return
    load()
  }, [load, tenant?.effectivePlan])

  // Erro de estado (mesa fechada em outro aparelho): recarrega, que decide se sai da tela.
  function handleError(error: unknown, fallback: string) {
    toast.error(getApiErrorMessage(error, fallback), { position: "top-center" })
    if (axios.isAxiosError(error) && [404, 409, 422].includes(error.response?.status ?? 0)) {
      void load()
    }
  }

  function enqueue(task: () => Promise<void>) {
    queueRef.current = queueRef.current.then(task, task)
  }

  function handlePick(line: CartLine) {
    enqueue(async () => {
      try {
        const response = await addPosTableItem(id, lineToApiItem(line))
        setTable(response.data)
      } catch (error) {
        handleError(error, "Erro ao lançar o item")
      }
    })
  }

  function withBusy(itemId: string, task: () => Promise<PosTableDetail>, fallback: string) {
    setBusyItemIds((current) => new Set(current).add(itemId))
    enqueue(async () => {
      try {
        setTable((await task()))
      } catch (error) {
        handleError(error, fallback)
      } finally {
        setBusyItemIds((current) => {
          const next = new Set(current)
          next.delete(itemId)
          return next
        })
      }
    })
  }

  function handleChangeQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return
    withBusy(itemId, async () => (await updatePosTableItem(id, itemId, quantity)).data, "Erro ao alterar a quantidade")
  }

  function handleRemove(itemId: string) {
    withBusy(itemId, async () => (await removePosTableItem(id, itemId)).data, "Erro ao remover o item")
  }

  async function handleClose(paymentMethod: PosPaymentMethod) {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    try {
      await closePosTable(id, paymentMethod)
      toast.success("Conta fechada", { position: "top-center" })
      navigate("/pdv", { replace: true })
    } catch (error) {
      setCloseOpen(false)
      handleError(error, "Erro ao fechar a conta")
    } finally {
      closingRef.current = false
      setClosing(false)
    }
  }

  async function handleDiscard() {
    try {
      await discardPosTable(id)
      toast.success("Mesa descartada", { position: "top-center" })
      navigate("/pdv", { replace: true })
    } catch (error) {
      handleError(error, "Erro ao descartar a mesa")
    }
  }

  async function handleCancel(reason: string) {
    try {
      setCanceling(true)
      await cancelPosTable(id, reason)
      toast.success("Mesa cancelada", { position: "top-center" })
      navigate("/pdv", { replace: true })
    } catch (error) {
      setCancelOpen(false)
      handleError(error, "Erro ao cancelar a mesa")
    } finally {
      setCanceling(false)
    }
  }

  const itemCount = table?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  const comanda = table && (
    <Comanda
      table={table}
      busyItemIds={busyItemIds}
      canCancel={owner}
      onChangeQuantity={handleChangeQuantity}
      onRemove={handleRemove}
      onClose={() => {
        setComandaSheetOpen(false)
        setCloseOpen(true)
      }}
      onDiscard={handleDiscard}
      onCancel={() => {
        setComandaSheetOpen(false)
        setCancelOpen(true)
      }}
    />
  )

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 pb-20 lg:pb-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" aria-label="Voltar para as mesas" onClick={() => navigate("/pdv")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">{table?.label ?? "Mesa"}</h1>
            {table && <p className="text-sm text-muted-foreground">Aberta às {formatTime(table.openedAt)}</p>}
          </div>
        </div>

        {!tenant ? (
          <Skeleton className="h-40 w-full" />
        ) : tenant.effectivePlan === "basico" ? (
          <PlanoBasicoNotice
            description="O PDV de balcão está disponível no plano completo."
            reassurance="Seus pedidos de delivery e o cardápio continuam funcionando normalmente no plano básico."
          />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-10 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar a mesa.</p>
            <Button variant="outline" onClick={load}>
              Tentar de novo
            </Button>
          </div>
        ) : !table ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <ProductPicker onPick={handlePick} actionLabel="Lançar" />

            <aside className="hidden lg:block">
              <div className="sticky top-4 rounded-xl border border-border bg-card p-4">{comanda}</div>
            </aside>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 lg:hidden">
              <Button className="h-12 w-full justify-between text-base" onClick={() => setComandaSheetOpen(true)}>
                <span className="flex items-center gap-2">
                  <ShoppingCart className="size-4" />
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </span>
                <span>{formatPrice(table.total)}</span>
              </Button>
            </div>

            <Sheet open={comandaSheetOpen} onOpenChange={setComandaSheetOpen}>
              <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl">
                <SheetHeader>
                  <SheetTitle className="sr-only">Comanda</SheetTitle>
                  <SheetDescription className="sr-only">Itens lançados na mesa</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-4">{comanda}</div>
              </SheetContent>
            </Sheet>

            <PaymentDialog
              open={closeOpen}
              onOpenChange={setCloseOpen}
              total={table.total}
              submitting={closing}
              onConfirm={handleClose}
              summary={
                <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border px-3 py-2 text-sm">
                  {table.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              }
            />

            <ReasonDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              title="Cancelar mesa?"
              description={`${table.label} e seus itens serão cancelados e não entram nas vendas.`}
              confirmText="Cancelar mesa"
              submitting={canceling}
              onSubmit={handleCancel}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
