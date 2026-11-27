import { useState } from "react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePrinter } from "@/contexts/PrinterContext"
import { pedidoDeExemplo } from "@/lib/printer/escpos"
import type { CodePage, PaperColumns } from "@/lib/printer/settings"
import { usePrintOrder } from "./usePrintOrder"

interface PrinterSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Configurações da impressora deste computador.
export function PrinterSettingsSheet({ open, onOpenChange }: PrinterSettingsSheetProps) {
  const printer = usePrinter()
  const { printOrder } = usePrintOrder()
  const [printingTest, setPrintingTest] = useState(false)

  async function handleTestPrint() {
    try {
      setPrintingTest(true)
      const sent = await printOrder(pedidoDeExemplo(), true)
      if (sent) toast.success("Teste enviado. Confira a impressora.", { position: "top-center" })
    } catch {
      toast.error("Não consegui imprimir. Reconecte a impressora e tente de novo.", { position: "top-center" })
    } finally {
      setPrintingTest(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Impressora de comandas</SheetTitle>
          <SheetDescription>Impressora térmica conectada a este computador. Estas opções valem só aqui.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          {/* Status e conexão */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground" role="status">
              <span className={`size-2.5 rounded-full ${printer.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              {printer.connecting ? "Conectando..." : printer.connected ? "Conectada" : "Desconectada"}
            </p>

            {printer.connected ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => printer.disconnect()}>
                  Desconectar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => printer.connect("choose")} disabled={printer.connecting}>
                  Trocar impressora
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => printer.connect("user")} disabled={printer.connecting}>
                  {printer.lost ? "Reconectar" : "Conectar impressora"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => printer.connect("choose")} disabled={printer.connecting}>
                  Escolher outra porta
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Pareie a impressora no Bluetooth do Windows antes. Na janela que abrir, escolha a porta COM dela.
            </p>
          </div>

          {/* Impressão automática */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="printer-auto">Imprimir ao iniciar o preparo</Label>
              <p className="text-xs text-muted-foreground">
                A comanda sai quando você clica em "Iniciar preparo" neste computador.
              </p>
            </div>
            <Switch
              id="printer-auto"
              checked={printer.settings.autoPrint}
              onCheckedChange={(checked) => printer.updateSettings({ autoPrint: checked })}
            />
          </div>

          {/* Tabela de caracteres */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="printer-codepage">Tabela de caracteres</Label>
            <Select
              value={String(printer.settings.codePage)}
              onValueChange={(value) => printer.updateSettings({ codePage: Number(value) as CodePage })}
            >
              <SelectTrigger id="printer-codepage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="71">WPC1252 (71) - padrão</SelectItem>
                <SelectItem value="55">OEM860 (55) - português</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se os acentos saírem errados no teste, troque para a outra opção.</p>
          </div>

          {/* Largura do papel */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="printer-columns">Largura do papel</Label>
            <Select
              value={String(printer.settings.columns)}
              onValueChange={(value) => printer.updateSettings({ columns: Number(value) as PaperColumns })}
            >
              <SelectTrigger id="printer-columns" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="32">58 mm (32 caracteres)</SelectItem>
                <SelectItem value="48">80 mm (48 caracteres)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" onClick={handleTestPrint} disabled={printingTest || printer.connecting}>
            {printingTest ? "Imprimindo..." : "Imprimir teste"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
