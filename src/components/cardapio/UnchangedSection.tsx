import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { formatPrice } from "@/lib/utils-api"
import { plural, type UnchangedEntry } from "./importDraft"

export function UnchangedSection({ items }: { items: UnchangedEntry[] }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <section className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground"
      >
        <span>
          Já cadastrados, sem mudanças ({items.length})
          <span className="block text-xs font-normal text-muted-foreground">
            {plural(items.length, "já está", "já estão")} no seu cardápio, nada a fazer.
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="flex flex-col gap-1 border-t border-border px-3 py-2">
          {items.map((item) => (
            <li key={item.tempId} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
              <span className="text-foreground">{item.name}</span>
              <span>
                {item.categoryHasSizes ? "Preço definido pelo tamanho da categoria" : item.priceCents !== null ? formatPrice(item.priceCents) : ""}
                {item.inactive && " · desativado"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
