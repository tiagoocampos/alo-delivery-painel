import axios from "axios"
import { centsToReais, reaisToCents } from "@/lib/utils-api"
import type {
  Category,
  MenuImportChange,
  MenuImportChangeField,
  MenuImportConfirmItem,
  MenuImportItem,
  MenuImportPreview,
  MenuImportProductRef,
  ProductAvailability,
} from "@/types"

const MAX_PRICE_CENTS = 99_999_999
const ID_PREFIX = "id:"
const NEW_PREFIX = "new:"

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_TEXT_LENGTH = 8000

export interface CategoryOption {
  value: string
  label: string
  hasSizes: boolean
}

export interface NewDraft {
  tempId: string
  selected: boolean
  name: string
  price: string
  category: string
  description: string
  ingredients: string[]
  availability: ProductAvailability
  priceUnreadable: boolean
}

export interface ChangedDraft {
  tempId: string
  name: string
  match: MenuImportProductRef
  inactive: boolean
  selected: boolean
  changes: MenuImportChange[]
  apply: Record<MenuImportChangeField, boolean>
  price: string
  description: string
  ingredients: string[]
}

export type SimilarDecision = "pending" | "ignore" | "new" | { updateProductId: string }

export interface SimilarDraft {
  tempId: string
  item: MenuImportItem
  decision: SimilarDecision
  create: NewDraft
}

export interface UnchangedEntry {
  tempId: string
  name: string
  priceCents: number | null
  categoryHasSizes: boolean
  inactive: boolean
}

export interface ImportDraft {
  categories: CategoryOption[]
  changed: ChangedDraft[]
  created: NewDraft[]
  similar: SimilarDraft[]
  unchanged: UnchangedEntry[]
}

// ---------------------------------------------------------------- preço

export function parsePriceToCents(value: string): number | null {
  const text = value.trim()
  if (!/^\d+([.,]\d{1,2})?$/.test(text)) return null
  const cents = reaisToCents(text.replace(".", ","))
  return cents > 0 && cents <= MAX_PRICE_CENTS ? cents : null
}

// Mantém só dígitos e uma vírgula decimal com até 2 casas ("25.9" -> "25,9").
export function maskPriceInput(value: string): string {
  const cleaned = value.replace(".", ",").replace(/[^\d,]/g, "")
  const [integer = "", ...rest] = cleaned.split(",")
  if (rest.length === 0) return integer
  return `${integer},${rest.join("").slice(0, 2)}`
}

// ---------------------------------------------------------------- montagem

export function buildCategoryOptions(existing: Category[], preview: MenuImportPreview): CategoryOption[] {
  const options: CategoryOption[] = existing.map((category) => {
    const suggested = preview.categories.find((entry) => entry.categoryId === category.id)
    return {
      value: `${ID_PREFIX}${category.id}`,
      label: category.name,
      hasSizes: category.sizes.length > 0 || Boolean(suggested?.hasSizes),
    }
  })

  for (const category of preview.categories) {
    if (category.categoryId || !category.isNew) continue
    options.push({ value: `${NEW_PREFIX}${category.name}`, label: `Nova: ${category.name}`, hasSizes: false })
  }

  return options
}

function categoryValue(extracted: MenuImportItem["extracted"]): string {
  return extracted.categoryId ? `${ID_PREFIX}${extracted.categoryId}` : `${NEW_PREFIX}${extracted.categoryName}`
}

function toNewDraft(item: MenuImportItem, selected: boolean): NewDraft {
  return {
    tempId: item.tempId,
    selected,
    name: item.extracted.name,
    price: item.extracted.priceCents === null ? "" : centsToReais(item.extracted.priceCents),
    category: categoryValue(item.extracted),
    description: item.extracted.description ?? "",
    ingredients: item.extracted.ingredients,
    availability: item.extracted.availability,
    priceUnreadable: item.warnings.includes("PRICE_UNREADABLE"),
  }
}

function changeTarget<T extends MenuImportChange["to"]>(changes: MenuImportChange[], field: MenuImportChangeField, fallback: T): T {
  const change = changes.find((entry) => entry.field === field)
  return (change ? change.to : fallback) as T
}

function toChangedDraft(item: MenuImportItem): ChangedDraft {
  const priceTo = changeTarget<number | null>(item.changes, "price", null)
  return {
    tempId: item.tempId,
    name: item.match?.name ?? item.extracted.name,
    match: item.match!,
    inactive: item.warnings.includes("PRODUCT_INACTIVE"),
    selected: true,
    changes: item.changes,
    apply: {
      price: item.changes.some((change) => change.field === "price"),
      description: item.changes.some((change) => change.field === "description"),
      ingredients: item.changes.some((change) => change.field === "ingredients"),
    },
    price: priceTo === null ? "" : centsToReais(priceTo),
    description: changeTarget<string>(item.changes, "description", ""),
    ingredients: changeTarget<string[]>(item.changes, "ingredients", []),
  }
}

export function buildDraft(preview: MenuImportPreview, existing: Category[]): ImportDraft {
  const categories = buildCategoryOptions(existing, preview)
  const hasSizes = (value: string) => categories.find((option) => option.value === value)?.hasSizes ?? false

  const draft: ImportDraft = { categories, changed: [], created: [], similar: [], unchanged: [] }

  for (const item of preview.items) {
    if (item.status === "changed" && item.match) {
      draft.changed.push(toChangedDraft(item))
    } else if (item.status === "new") {
      const blocked = item.warnings.length > 0 || hasSizes(categoryValue(item.extracted))
      draft.created.push(toNewDraft(item, !blocked))
    } else if (item.status === "similar") {
      draft.similar.push({ tempId: item.tempId, item, decision: "pending", create: toNewDraft(item, true) })
    } else {
      draft.unchanged.push({
        tempId: item.tempId,
        name: item.match?.name ?? item.extracted.name,
        priceCents: item.match?.priceCents ?? null,
        categoryHasSizes: item.warnings.includes("CATEGORY_HAS_SIZES"),
        inactive: item.warnings.includes("PRODUCT_INACTIVE"),
      })
    }
  }

  return draft
}

// ---------------------------------------------------------------- validação

// Pendências que impedem gravar o item enquanto ele estiver marcado.
export function newDraftIssues(draft: NewDraft, categories: CategoryOption[]): string[] {
  const issues: string[] = []
  if (!draft.name.trim()) issues.push("Informe o nome.")
  if (draft.name.trim().length > 120) issues.push("O nome pode ter até 120 caracteres.")
  if (parsePriceToCents(draft.price) === null) {
    issues.push(draft.priceUnreadable && !draft.price ? "Não conseguimos ler o preço. Informe o valor." : "Informe um preço válido.")
  }
  const category = categories.find((option) => option.value === draft.category)
  if (!category) issues.push("Escolha uma categoria.")
  else if (category.hasSizes) issues.push("Essa categoria usa tamanhos com preço próprio. Escolha outra ou desmarque o item.")
  return issues
}

export function changedDraftIssues(draft: ChangedDraft): string[] {
  const issues: string[] = []
  if (draft.apply.price && parsePriceToCents(draft.price) === null) issues.push("Informe um preço válido.")
  if (draft.apply.description && !draft.description.trim()) issues.push("A descrição não pode ficar vazia.")
  return issues
}

function similarUpdateFields(draft: SimilarDraft, productId: string) {
  const candidate = draft.item.candidates.find((entry) => entry.productId === productId)
  const priceCents = draft.item.extracted.priceCents
  if (!candidate || priceCents === null || candidate.priceCents === priceCents) return null
  return { priceCents }
}

// ---------------------------------------------------------------- corpo do confirm

function newDraftToConfirm(draft: NewDraft): MenuImportConfirmItem {
  const description = draft.description.trim()
  const base = {
    action: "create" as const,
    name: draft.name.replace(/\s+/g, " ").trim(),
    priceCents: parsePriceToCents(draft.price)!,
    availability: draft.availability,
    ...(description ? { description } : {}),
    ...(draft.ingredients.length > 0 ? { ingredients: draft.ingredients } : {}),
  }
  return draft.category.startsWith(ID_PREFIX)
    ? { ...base, categoryId: draft.category.slice(ID_PREFIX.length) }
    : { ...base, newCategoryName: draft.category.slice(NEW_PREFIX.length) }
}

function changedDraftToConfirm(draft: ChangedDraft): MenuImportConfirmItem | null {
  const fields: Extract<MenuImportConfirmItem, { action: "update" }>["fields"] = {}
  if (draft.apply.price) fields.priceCents = parsePriceToCents(draft.price)!
  if (draft.apply.description) fields.description = draft.description.trim()
  if (draft.apply.ingredients) fields.ingredients = draft.ingredients
  if (Object.keys(fields).length === 0) return null
  return { action: "update", productId: draft.match.productId, fields }
}

export interface ImportPlan {
  items: MenuImportConfirmItem[]
  creates: number
  updates: number
  // Itens marcados que ainda precisam de correção ou decisão.
  blockers: number
  pendingDecisions: number
}

export function buildPlan(draft: ImportDraft): ImportPlan {
  const items: MenuImportConfirmItem[] = []
  let creates = 0
  let updates = 0
  let blockers = 0
  let pendingDecisions = 0

  for (const entry of draft.changed) {
    if (!entry.selected) continue
    if (changedDraftIssues(entry).length > 0) {
      blockers += 1
      continue
    }
    const item = changedDraftToConfirm(entry)
    if (item) {
      items.push(item)
      updates += 1
    }
  }

  for (const entry of draft.created) {
    if (!entry.selected) continue
    if (newDraftIssues(entry, draft.categories).length > 0) {
      blockers += 1
      continue
    }
    items.push(newDraftToConfirm(entry))
    creates += 1
  }

  for (const entry of draft.similar) {
    const { decision } = entry
    if (decision === "pending") {
      pendingDecisions += 1
    } else if (decision === "new") {
      if (newDraftIssues(entry.create, draft.categories).length > 0) {
        blockers += 1
        continue
      }
      items.push(newDraftToConfirm(entry.create))
      creates += 1
    } else if (decision !== "ignore") {
      const fields = similarUpdateFields(entry, decision.updateProductId)
      if (fields) {
        items.push({ action: "update", productId: decision.updateProductId, fields })
        updates += 1
      }
    }
  }

  return { items, creates, updates, blockers, pendingDecisions }
}

export function similarUpdateHasChanges(draft: SimilarDraft, productId: string): boolean {
  return similarUpdateFields(draft, productId) !== null
}

// ---------------------------------------------------------------- textos

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function summaryText(summary: MenuImportPreview["summary"]): string {
  const parts: string[] = []
  if (summary.new) parts.push(plural(summary.new, "novo", "novos"))
  if (summary.changed) parts.push(plural(summary.changed, "alterado", "alterados"))
  if (summary.similar) parts.push(plural(summary.similar, "parecido", "parecidos"))
  if (summary.unchanged) parts.push(plural(summary.unchanged, "já cadastrado", "já cadastrados"))
  return `${plural(summary.total, "item lido", "itens lidos")}: ${parts.join(", ")}.`
}

export function applyButtonText(plan: ImportPlan): string {
  const total = plan.creates + plan.updates
  const parts: string[] = []
  if (plan.creates) parts.push(plural(plan.creates, "novo", "novos"))
  if (plan.updates) parts.push(plural(plan.updates, "atualizado", "atualizados"))
  return `Aplicar ${plural(total, "mudança", "mudanças")} (${parts.join(", ")})`
}

// Mensagens amigáveis; nunca expõe erro técnico bruto.
export function importErrorMessage(error: unknown): string {
  const UNAVAILABLE =
    "O serviço de leitura está indisponível agora. Você pode cadastrar ou editar os produtos manualmente."

  if (!axios.isAxiosError(error)) return UNAVAILABLE
  const status = error.response?.status
  if (!status) return UNAVAILABLE
  if (status === 403) return "Disponível no plano completo."
  if (status === 429) return "Você usou muitas importações seguidas. Tente novamente mais tarde."
  if (status === 422) {
    // O backend manda mensagens em português e seguras de exibir nos 4xx de negócio.
    const message = error.response?.data?.error
    return typeof message === "string" && message ? message : "Não conseguimos ler o cardápio. Tente uma foto mais nítida ou cole o texto."
  }
  if (status === 400 || status === 404) {
    const message = error.response?.data?.error
    return typeof message === "string" && message ? message : "Não foi possível processar essa importação. Revise os dados e tente de novo."
  }
  return UNAVAILABLE
}
