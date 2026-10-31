import { useEffect, useState } from "react"
import { Banknote, CreditCard, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatPrice, reaisToCents } from "@/lib/utils-api"
import type { PosPaymentMethod } from "@/types"

export const PAYMENT_LABELS: Record<PosPaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
}

const PAYMENT_ICONS = {
  dinheiro: Banknote,
  pix: QrCode,
  cartao_debito: CreditCard,
  cartao_credito: CreditCard,
}

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  submitting: boolean
  onConfirm: (method: PosPaymentMethod) => void
}

const MONEY_REGEX = /^\d+([.,]\d{1,2})?$/

export function PaymentDialog({ open, onOpenChange, total, submitting, onConfirm }: PaymentDialogProps) {
  const [method, setMethod] = useState<PosPaymentMethod | null>(null)
  const [received, setReceived] = useState("")

  useEffect(() => {
    if (!open) return
    setMethod(null)
    setReceived("")
  }, [open])

  const receivedCents = MONEY_REGEX.test(received.trim()) ? reaisToCents(received.trim()) : 0
  const change = receivedCents - total
  const cashInvalid = method === "dinheiro" && receivedCents < total
  const canConfirm = method !== null && !cashInvalid && !submitting

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canConfirm || !method) return
    onConfirm(method)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar venda</DialogTitle>
          <DialogDescription>Escolha a forma de pagamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-end justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-semibold text-foreground">{formatPrice(total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PAYMENT_LABELS) as PosPaymentMethod[]).map((key) => {
              const Icon = PAYMENT_ICONS[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  aria-pressed={method === key}
                  className={cn(
                    "flex h-20 flex-col items-center justify-center gap-1 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-muted",
                    method === key && "border-primary bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  {PAYMENT_LABELS[key]}
                </button>
              )
            })}
          </div>

          {method === "dinheiro" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="received">Valor recebido (R$)</Label>
              <Input
                id="received"
                inputMode="decimal"
                placeholder="0,00"
                autoFocus
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              <p className={cn("text-sm font-medium", cashInvalid ? "text-destructive" : "text-foreground")}>
                {cashInvalid
                  ? receivedCents === 0
                    ? "Informe o valor recebido."
                    : `Faltam ${formatPrice(total - receivedCents)}.`
                  : `Troco: ${formatPrice(change)}`}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" size="lg" className="h-11" disabled={!canConfirm}>
              {submitting ? "Registrando..." : "Confirmar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
