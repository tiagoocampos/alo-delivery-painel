import { Ban } from "lucide-react"

interface OrderItemNoteProps {
  note: string
}

// A observação do item vem do storefront como, no máximo, duas partes: uma
// linha "SEM: tomate, milho" (ingredientes que o cliente tirou) e o texto livre
// do cliente. A linha "SEM:" ganha destaque para a cozinha enxergar de longe.
export function OrderItemNote({ note }: OrderItemNoteProps) {
  const lines = note
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const removed = lines.filter((line) => line.startsWith("SEM:"))
  const free = lines.filter((line) => !line.startsWith("SEM:"))

  if (removed.length === 0 && free.length === 0) return null

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {removed.map((line) => (
        <p key={line} className="flex items-start gap-1 text-sm font-bold text-destructive">
          <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{line}</span>
        </p>
      ))}
      {free.length > 0 && (
        <p className="whitespace-pre-line text-xs text-muted-foreground/80">Obs.: {free.join("\n")}</p>
      )}
    </div>
  )
}
