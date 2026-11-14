import { NewItemCard } from "./NewItemCard"
import type { CategoryOption, NewDraft } from "./importDraft"

interface NewSectionProps {
  items: NewDraft[]
  categories: CategoryOption[]
  onChange: (tempId: string, patch: Partial<NewDraft>) => void
  onRemove: (tempId: string) => void
}

export function NewSection({ items, categories, onChange, onRemove }: NewSectionProps) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="import-new-title" className="flex flex-col gap-2">
      <h3 id="import-new-title" className="text-sm font-semibold text-foreground">
        Novos ({items.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <NewItemCard
            key={item.tempId}
            draft={item}
            categories={categories}
            onChange={(patch) => onChange(item.tempId, patch)}
            onRemove={() => onRemove(item.tempId)}
          />
        ))}
      </ul>
    </section>
  )
}
