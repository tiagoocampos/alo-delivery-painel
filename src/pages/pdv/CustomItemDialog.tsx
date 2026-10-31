import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { reaisToCents } from "@/lib/utils-api"
import { buildCustomLine, type CartLine } from "./cart"

interface CustomItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (line: CartLine) => void
}

const MONEY_REGEX = /^\d+([.,]\d{1,2})?$/

export function CustomItemDialog({ open, onOpenChange, onAdd }: CustomItemDialogProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setName("")
    setPrice("")
    setQuantity("1")
    setError("")
  }, [open])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError("O nome deve ter de 1 a 80 caracteres")
      return
    }
    const normalizedPrice = price.trim()
    const cents = MONEY_REGEX.test(normalizedPrice) ? reaisToCents(normalizedPrice) : 0
    if (cents <= 0) {
      setError("Informe um valor maior que zero (ex: 18,00)")
      return
    }
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      setError("A quantidade deve ser um número inteiro maior que zero")
      return
    }
    onAdd(buildCustomLine(trimmed, cents, qty))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Item avulso</DialogTitle>
          <DialogDescription>Para qualquer coisa fora do cadastro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-name">Nome</Label>
            <Input id="custom-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-price">Valor (R$)</Label>
              <Input
                id="custom-price"
                inputMode="decimal"
                placeholder="0,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-qty">Quantidade</Label>
              <Input
                id="custom-qty"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          {error && <span className="text-xs text-destructive">{error}</span>}
          <DialogFooter>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
