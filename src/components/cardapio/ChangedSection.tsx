import { ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IngredientsField } from "@/components/IngredientsField"
import { formatPrice } from "@/lib/utils-api"
import type { MenuImportChange, MenuImportChangeField } from "@/types"
import { ImportCheckbox } from "./ImportCheckbox"
import { changedDraftIssues, maskPriceInput, type ChangedDraft } from "./importDraft"

const FIELD_LABELS: Record<MenuImportChangeField, string> = {
  price: "Preço",
  description: "Descrição",
  ingredients: "Ingredientes",
}

function formatValue(change: MenuImportChange, value: MenuImportChange["from"]): string {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "—"
  if (change.field === "price") return formatPrice(value as number)
  if (change.field === "ingredients") return (value as string[]).join(", ")
  return String(value)
}

interface ChangedSectionProps {
  items: ChangedDraft[]
  onChange: (tempId: string, patch: Partial<ChangedDraft>) => void
  onRemove: (tempId: string) => void
}

export function ChangedSection({ items, onChange, onRemove }: ChangedSectionProps) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="import-changed-title" className="flex flex-col gap-2">
      <h3 id="import-changed-title" className="text-sm font-semibold text-foreground">
        Alterados ({items.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const issues = item.selected ? changedDraftIssues(item) : []
          const id = `import-${item.tempId}`

          return (
            <li key={item.tempId} className={`flex flex-col gap-3 rounded-lg border p-3 ${issues.length ? "border-amber-400 bg-amber-50/50" : "border-border"}`}>
              <div className="flex items-center gap-2">
                <ImportCheckbox
                  id={`${id}-selected`}
                  checked={item.selected}
                  onChange={(e) => onChange(item.tempId, { selected: e.target.checked })}
                />
                <Label htmlFor={`${id}-selected`} className="min-w-0 flex-1 truncate">
                  {item.name}
                </Label>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemove(item.tempId)} aria-label={`Remover ${item.name}`}>
                  <X className="size-4" />
                </Button>
              </div>

              {item.inactive && <p className="text-xs text-muted-foreground">Este produto está desativado no cardápio.</p>}

              <div className={`flex flex-col gap-3 ${item.selected ? "" : "opacity-60"}`}>
                {item.changes.map((change) => (
                  <div key={change.field} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <ImportCheckbox
                        id={`${id}-${change.field}-apply`}
                        checked={item.apply[change.field]}
                        onChange={(e) => onChange(item.tempId, { apply: { ...item.apply, [change.field]: e.target.checked } })}
                      />
                      <Label htmlFor={`${id}-${change.field}-apply`}>{FIELD_LABELS[change.field]}</Label>
                    </div>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="line-through">{formatValue(change, change.from)}</span>
                      <ArrowRight className="size-3" aria-label="para" />
                      <span className="font-medium text-foreground">
                        {change.field === "price"
                          ? item.price ? formatPrice(Math.round(Number(item.price.replace(",", ".")) * 100)) : "—"
                          : change.field === "description"
                            ? item.description || "—"
                            : item.ingredients.join(", ") || "—"}
                      </span>
                    </p>

                    {change.field === "price" && (
                      <Input
                        aria-label={`Novo preço de ${item.name}`}
                        inputMode="decimal"
                        value={item.price}
                        disabled={!item.apply.price}
                        onChange={(e) => onChange(item.tempId, { price: maskPriceInput(e.target.value) })}
                      />
                    )}
                    {change.field === "description" && (
                      <Textarea
                        aria-label={`Nova descrição de ${item.name}`}
                        value={item.description}
                        rows={2}
                        maxLength={500}
                        disabled={!item.apply.description}
                        onChange={(e) => onChange(item.tempId, { description: e.target.value })}
                      />
                    )}
                    {change.field === "ingredients" && item.apply.ingredients && (
                      <IngredientsField
                        value={item.ingredients}
                        onChange={(ingredients) => onChange(item.tempId, { ingredients })}
                        description={item.description}
                      />
                    )}
                  </div>
                ))}
              </div>

              {issues.length > 0 && (
                <p role="alert" className="text-xs text-amber-700">
                  {issues.join(" ")}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
