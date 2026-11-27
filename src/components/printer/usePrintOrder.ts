import { usePrinter } from "@/contexts/PrinterContext"
import { useTenant } from "@/contexts/TenantContext"
import { montarComanda } from "@/lib/printer/escpos"
import type { Order } from "@/types"

// Imprime a comanda de um pedido.
// userAction = true quando veio de um clique (pode abrir a janela de escolher a porta).
// Retorna true se a comanda foi enviada; false se não havia impressora.
// Lança erro se a impressora falhar no meio.
export function usePrintOrder() {
  const printer = usePrinter()
  const { tenant } = useTenant()

  async function printOrder(order: Order, userAction: boolean): Promise<boolean> {
    if (!printer.supported) return false

    const ready = await printer.connect(userAction ? "user" : "silent")
    if (!ready) return false

    await printer.print(montarComanda(order, tenant?.name ?? "Alô Delivery", printer.settings))
    return true
  }

  return { printOrder }
}
