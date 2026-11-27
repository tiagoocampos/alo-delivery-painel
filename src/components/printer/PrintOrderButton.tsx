import { useState } from "react"
import { Printer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePrinter } from "@/contexts/PrinterContext"
import type { Order } from "@/types"
import { usePrintOrder } from "./usePrintOrder"

interface PrintOrderButtonProps {
  order: Order
  className?: string
  size?: "sm" | "default"
}

// Botão "Imprimir comanda" (também serve para reimprimir).
// Só aparece depois do pedido sair de "novo" e em navegador com suporte.
export function PrintOrderButton({ order, className, size = "sm" }: PrintOrderButtonProps) {
  const { supported } = usePrinter()
  const { printOrder } = usePrintOrder()
  const [printing, setPrinting] = useState(false)

  if (!supported || order.status === "novo" || order.status === "cancelado") return null

  async function handleClick() {
    try {
      setPrinting(true)
      // Por ser um clique, se a impressora estiver desconectada ele tenta reconectar.
      const sent = await printOrder(order, true)
      if (sent) toast.success("Comanda enviada para a impressora.", { position: "top-center" })
    } catch {
      toast.error("Não consegui imprimir. Reconecte a impressora e tente de novo.", { position: "top-center" })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Button type="button" variant="outline" size={size} disabled={printing} onClick={handleClick} className={className}>
      <Printer className="size-3.5" />
      {printing ? "Imprimindo..." : "Imprimir comanda"}
    </Button>
  )
}
