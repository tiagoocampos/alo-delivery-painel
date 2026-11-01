import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createPosSale } from "@/services/pos"
import { formatPrice, getApiErrorMessage } from "@/lib/utils-api"
import type { PosPaymentMethod } from "@/types"
import { MAX_LINE_QUANTITY, addLine, cartCount, cartTotal, lineToApiItem, type CartLine } from "./cart"
import { CartPanel } from "./CartPanel"
import { PaymentDialog } from "./PaymentDialog"
import { ProductPicker } from "./ProductPicker"

export function VendaRapida() {
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Gerado ao abrir o pagamento e reaproveitado em novas tentativas (idempotência);
  // zerado sempre que o carrinho muda, para não reenviar itens diferentes sob o mesmo id.
  const clientIdRef = useRef<string | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    clientIdRef.current = null
  }, [cart])

  function changeQuantity(key: string, delta: number) {
    setCart((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, Math.max(1, line.quantity + delta)) } : line))
    )
  }

  function openPayment() {
    if (cart.length === 0) return
    clientIdRef.current ??= crypto.randomUUID()
    setCartSheetOpen(false)
    setPaymentOpen(true)
  }

  async function confirmSale(paymentMethod: PosPaymentMethod) {
    if (submittingRef.current || cart.length === 0 || !clientIdRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await createPosSale({
        clientId: clientIdRef.current,
        paymentMethod,
        items: cart.map(lineToApiItem),
      })
      toast.success("Venda registrada", { position: "top-center" })
      setPaymentOpen(false)
      setCart([])
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Erro ao registrar a venda"), { position: "top-center" })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const count = cartCount(cart)
  const total = cartTotal(cart)

  const cartPanel = (
    <CartPanel
      lines={cart}
      onChangeQuantity={changeQuantity}
      onRemove={(key) => setCart((current) => current.filter((line) => line.key !== key))}
      onClear={() => setCart([])}
      onCheckout={openPayment}
    />
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ProductPicker onPick={(line) => setCart((current) => addLine(current, line))} />

      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-xl border border-border bg-card p-4">{cartPanel}</div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 lg:hidden">
        <Button className="h-12 w-full justify-between text-base" onClick={() => setCartSheetOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            {count} {count === 1 ? "item" : "itens"}
          </span>
          <span>{formatPrice(total)}</span>
        </Button>
      </div>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="sr-only">Carrinho</SheetTitle>
            <SheetDescription className="sr-only">Itens da venda atual</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{cartPanel}</div>
        </SheetContent>
      </Sheet>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        submitting={submitting}
        onConfirm={confirmSale}
      />
    </div>
  )
}
