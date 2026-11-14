import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { MenuImportPreview } from "@/types"
import { ChangedSection } from "./ChangedSection"
import { NewSection } from "./NewSection"
import { SimilarSection } from "./SimilarSection"
import { UnchangedSection } from "./UnchangedSection"
import { summaryText, type ImportDraft } from "./importDraft"

interface ReviewStepProps {
  summary: MenuImportPreview["summary"]
  draft: ImportDraft
  onDraftChange: (draft: ImportDraft) => void
}

export function ReviewStep({ summary, draft, onDraftChange }: ReviewStepProps) {
  const nothingToDo = summary.new + summary.changed + summary.similar === 0

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />A IA pode errar preços e nomes. Revise antes de salvar.
      </p>

      <p className="text-sm font-medium text-foreground" aria-live="polite">
        {summaryText(summary)}
      </p>

      {nothingToDo ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <CheckCircle2 className="size-8 text-emerald-600" />
          <p className="text-sm font-medium text-foreground">Seu cardápio já está atualizado.</p>
          <p className="text-xs text-muted-foreground">Nenhuma mudança encontrada.</p>
        </div>
      ) : (
        <>
          <ChangedSection
            items={draft.changed}
            onChange={(tempId, patch) =>
              onDraftChange({ ...draft, changed: draft.changed.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)) })
            }
            onRemove={(tempId) => onDraftChange({ ...draft, changed: draft.changed.filter((item) => item.tempId !== tempId) })}
          />

          <NewSection
            items={draft.created}
            categories={draft.categories}
            onChange={(tempId, patch) =>
              onDraftChange({ ...draft, created: draft.created.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)) })
            }
            onRemove={(tempId) => onDraftChange({ ...draft, created: draft.created.filter((item) => item.tempId !== tempId) })}
          />

          <SimilarSection
            items={draft.similar}
            categories={draft.categories}
            onDecide={(tempId, decision) =>
              onDraftChange({ ...draft, similar: draft.similar.map((item) => (item.tempId === tempId ? { ...item, decision } : item)) })
            }
            onChangeCreate={(tempId, patch) =>
              onDraftChange({
                ...draft,
                similar: draft.similar.map((item) => (item.tempId === tempId ? { ...item, create: { ...item.create, ...patch } } : item)),
              })
            }
          />
        </>
      )}

      <UnchangedSection items={draft.unchanged} />

      <p className="text-xs text-muted-foreground">Itens que não aparecem na foto não serão apagados nem alterados.</p>
    </div>
  )
}
