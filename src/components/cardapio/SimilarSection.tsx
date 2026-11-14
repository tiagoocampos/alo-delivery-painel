import { HelpCircle } from "lucide-react"
import { formatPrice } from "@/lib/utils-api"
import { NewItemFields } from "./NewItemCard"
import {
  newDraftIssues,
  similarUpdateHasChanges,
  type CategoryOption,
  type NewDraft,
  type SimilarDecision,
  type SimilarDraft,
} from "./importDraft"

interface SimilarSectionProps {
  items: SimilarDraft[]
  categories: CategoryOption[]
  onDecide: (tempId: string, decision: SimilarDecision) => void
  onChangeCreate: (tempId: string, patch: Partial<NewDraft>) => void
}

function RadioOption({
  name,
  label,
  checked,
  onSelect,
}: {
  name: string
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span>{label}</span>
    </label>
  )
}

export function SimilarSection({ items, categories, onDecide, onChangeCreate }: SimilarSectionProps) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="import-similar-title" className="flex flex-col gap-2">
      <h3 id="import-similar-title" className="text-sm font-semibold text-foreground">
        Parecidos, precisam de decisão ({items.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const { decision } = item
          const pending = decision === "pending"
          const radioName = `import-${item.tempId}-decision`
          const extractedPrice = item.item.extracted.priceCents

          return (
            <li key={item.tempId} className={`flex flex-col gap-2 rounded-lg border p-3 ${pending ? "border-amber-400 bg-amber-50/50" : "border-border"}`}>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 flex items-start gap-1.5 text-sm font-medium text-foreground">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>
                    Lemos "{item.item.extracted.name}"
                    {extractedPrice !== null && ` (${formatPrice(extractedPrice)})`}. É qual produto?
                  </span>
                </legend>

                {item.item.candidates.map((candidate) => (
                  <RadioOption
                    key={candidate.productId}
                    name={radioName}
                    label={`É o mesmo produto: ${candidate.name}${candidate.priceCents !== null ? ` (${formatPrice(candidate.priceCents)})` : ""}`}
                    checked={typeof decision === "object" && decision.updateProductId === candidate.productId}
                    onSelect={() => onDecide(item.tempId, { updateProductId: candidate.productId })}
                  />
                ))}
                <RadioOption name={radioName} label="É um produto novo" checked={decision === "new"} onSelect={() => onDecide(item.tempId, "new")} />
                <RadioOption name={radioName} label="Ignorar" checked={decision === "ignore"} onSelect={() => onDecide(item.tempId, "ignore")} />
              </fieldset>

              {pending && (
                <p role="alert" className="text-xs text-amber-700">
                  Escolha uma opção para poder aplicar as mudanças.
                </p>
              )}

              {typeof decision === "object" && (
                <p className="text-xs text-muted-foreground">
                  {similarUpdateHasChanges(item, decision.updateProductId) && extractedPrice !== null
                    ? `O preço será atualizado para ${formatPrice(extractedPrice)}.`
                    : "O preço é o mesmo, então não há nada para atualizar."}
                </p>
              )}

              {decision === "new" && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <NewItemFields draft={item.create} categories={categories} onChange={(patch) => onChangeCreate(item.tempId, patch)} />
                  {newDraftIssues(item.create, categories).length > 0 && (
                    <p role="alert" className="text-xs text-amber-700">
                      {newDraftIssues(item.create, categories).join(" ")}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
