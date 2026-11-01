import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  submitting: boolean
  onSubmit: (reason: string) => void
}

// Diálogo com motivo obrigatório. Não usa ConfirmDialog porque o AlertDialogAction
// fecha sozinho e não deixaria validar o campo.
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  submitting,
  onSubmit,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setReason("")
    setError("")
  }, [open])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Informe o motivo do cancelamento")
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancel-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={200}
              onChange={(e) => {
                setReason(e.target.value)
                setError("")
              }}
            />
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Cancelando..." : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
