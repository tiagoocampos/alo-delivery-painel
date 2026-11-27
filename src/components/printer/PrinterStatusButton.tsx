import { useState } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePrinter } from "@/contexts/PrinterContext"
import { PrinterSettingsSheet } from "./PrinterSettingsSheet"

// Indicador pequeno no topo de Pedidos: mostra se a impressora está conectada
// e abre as configurações dela.
export function PrinterStatusButton() {
  const printer = usePrinter()
  const [open, setOpen] = useState(false)

  if (!printer.supported) {
    return (
      <p className="text-xs text-muted-foreground">Impressão direta disponível no Edge ou Chrome no computador.</p>
    )
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="w-fit gap-1.5">
        <Printer className="size-3.5" />
        <span className={`size-2 rounded-full ${printer.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
        {printer.connected ? "Impressora conectada" : printer.lost ? "Impressora desconectada - reconectar" : "Impressora desconectada"}
      </Button>
      <PrinterSettingsSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
