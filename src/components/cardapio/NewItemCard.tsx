import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IngredientsField } from "@/components/IngredientsField"
import type { ProductAvailability } from "@/types"
import { ImportCheckbox } from "./ImportCheckbox"
import { maskPriceInput, newDraftIssues, type CategoryOption, type NewDraft } from "./importDraft"

const AVAILABILITY_OPTIONS: { value: ProductAvailability; label: string }[] = [
  { value: "ambos", label: "Delivery e balcão" },
  { value: "delivery", label: "Só delivery" },
  { value: "balcao", label: "Só balcão" },
]

interface NewItemFieldsProps {
  draft: NewDraft
  categories: CategoryOption[]
  onChange: (patch: Partial<NewDraft>) => void
}

export function NewItemFields({ draft, categories, onChange }: NewItemFieldsProps) {
  const id = `import-${draft.tempId}`

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-name`}>Nome</Label>
        <Input id={`${id}-name`} value={draft.name} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-price`}>Preço (R$)</Label>
        <Input
          id={`${id}-price`}
          inputMode="decimal"
          placeholder="Ex: 25,90"
          value={draft.price}
          onChange={(e) => onChange({ price: maskPriceInput(e.target.value) })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-availability`}>Onde vender</Label>
        <Select value={draft.availability} onValueChange={(value) => onChange({ availability: value as ProductAvailability })}>
          <SelectTrigger id={`${id}-availability`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-category`}>Categoria</Label>
        <Select value={draft.category} onValueChange={(value) => onChange({ category: value })}>
          <SelectTrigger id={`${id}-category`} className="w-full">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.hasSizes}>
                {option.label}
                {option.hasSizes ? " (usa tamanhos)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sm:col-span-2">
        <IngredientsField
          value={draft.ingredients}
          onChange={(ingredients) => onChange({ ingredients })}
          description={draft.description}
        />
      </div>
    </div>
  )
}

interface NewItemCardProps {
  draft: NewDraft
  categories: CategoryOption[]
  onChange: (patch: Partial<NewDraft>) => void
  onRemove: () => void
}

export function NewItemCard({ draft, categories, onChange, onRemove }: NewItemCardProps) {
  const issues = draft.selected ? newDraftIssues(draft, categories) : []
  const hasWarning = draft.priceUnreadable || categories.find((option) => option.value === draft.category)?.hasSizes

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border p-3 ${
        issues.length > 0 || (hasWarning && !draft.selected) ? "border-amber-400 bg-amber-50/50" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <ImportCheckbox
          id={`import-${draft.tempId}-selected`}
          checked={draft.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
        />
        <Label htmlFor={`import-${draft.tempId}-selected`} className="min-w-0 flex-1 truncate">
          {draft.name || "Sem nome"}
        </Label>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remover ${draft.name || "item"}`}>
          <X className="size-4" />
        </Button>
      </div>

      {(issues.length > 0 || (hasWarning && !draft.selected)) && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          {issues.length > 0
            ? issues.join(" ")
            : draft.priceUnreadable
              ? "Preço ilegível. Informe o valor para incluir este item."
              : "Categoria com tamanhos. Escolha outra para incluir este item."}
        </p>
      )}

      <div className={draft.selected ? "" : "opacity-60"}>
        <NewItemFields draft={draft} categories={categories} onChange={onChange} />
      </div>
    </li>
  )
}
