import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { toast } from "sonner"
import { Armchair, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listPosTables, openPosTable } from "@/services/pos"
import { formatPrice, getApiErrorMessage } from "@/lib/utils-api"
import type { PosTableSummary } from "@/types"

const REFRESH_MS = 15_000

export function formatOpenedAgo(openedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60_000))
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `há ${hours} h` : `há ${hours} h ${rest} min`
}

// "2" vira "Mesa 2"; texto livre ("Balcão", "João") fica como está.
function normalizeLabel(raw: string): string {
  const trimmed = raw.trim()
  return /^\d+$/.test(trimmed) ? `Mesa ${trimmed}` : trimmed
}

export function Mesas() {
  const navigate = useNavigate()
  const [tables, setTables] = useState<PosTableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [labelInput, setLabelInput] = useState("")
  const [labelError, setLabelError] = useState("")
  const [opening, setOpening] = useState(false)

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await listPosTables()
      setTables(response.data)
      setLoadError(false)
    } catch {
      // Em atualização automática, mantém a lista atual em vez de trocar por erro.
      if (!silent) setLoadError(true)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = window.setInterval(() => load(true), REFRESH_MS)
    const onFocus = () => load(true)
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  async function handleOpen(event: React.FormEvent) {
    event.preventDefault()
    const label = normalizeLabel(labelInput)
    if (!label) {
      setLabelError("Informe o nome ou número da mesa")
      return
    }
    if (label.length > 30) {
      setLabelError("Use no máximo 30 caracteres")
      return
    }
    try {
      setOpening(true)
      const response = await openPosTable(label)
      navigate(`/pdv/mesa/${response.data.id}`)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const data = error.response.data ?? {}
        let existingId: string | undefined = data.id ?? data.tableId ?? data.table?.id
        if (!existingId) {
          const fresh = await listPosTables().catch(() => null)
          existingId = fresh?.data.find((table) => table.label.toLowerCase() === label.toLowerCase())?.id
        }
        toast.info("Essa mesa já está aberta", { position: "top-center" })
        if (existingId) {
          navigate(`/pdv/mesa/${existingId}`)
        } else {
          setDialogOpen(false)
          load(true)
        }
        return
      }
      toast.error(getApiErrorMessage(error, "Erro ao abrir a mesa"), { position: "top-center" })
    } finally {
      setOpening(false)
    }
  }

  function openDialog() {
    setLabelInput("")
    setLabelError("")
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <Button size="lg" className="h-12 w-full gap-2 text-base sm:w-fit" onClick={openDialog}>
        <Plus className="size-5" />
        Abrir mesa
      </Button>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card py-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as mesas.</p>
          <Button variant="outline" onClick={() => load()}>
            Tentar de novo
          </Button>
        </div>
      ) : tables.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma mesa aberta. Toque em Abrir mesa.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => navigate(`/pdv/mesa/${table.id}`)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <Armchair className="size-4 text-muted-foreground" />
                <span className="truncate font-heading text-base font-semibold text-foreground">{table.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Aberta {formatOpenedAgo(table.openedAt)} · {table.itemsCount}{" "}
                {table.itemsCount === 1 ? "item" : "itens"}
              </span>
              <span className="text-xl font-semibold text-foreground">{formatPrice(table.total)}</span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !opening && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir mesa</DialogTitle>
            <DialogDescription>Digite o número da mesa ou um nome (ex: 2, Balcão, João).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpen} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="table-label">Mesa</Label>
              <Input
                id="table-label"
                autoFocus
                maxLength={30}
                value={labelInput}
                onChange={(e) => {
                  setLabelInput(e.target.value)
                  setLabelError("")
                }}
              />
              {labelError && <span className="text-xs text-destructive">{labelError}</span>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={opening}>
                {opening ? "Abrindo..." : "Abrir mesa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
