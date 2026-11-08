export const MAX_INGREDIENTS = 30
export const MAX_INGREDIENT_LENGTH = 40

// Chave de comparação: sem maiúsculas/minúsculas e sem acentos ("Pão" = "pao").
function comparisonKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

// Texto digitado/colado -> itens soltos. Vírgula e quebra de linha separam.
export function splitIngredientText(text: string): string[] {
  return text.split(/[,\n\r]/)
}

export interface AddIngredientsResult {
  list: string[]
  // Avisos amigáveis do que não entrou (duplicado, grande demais, limite).
  messages: string[]
}

// Acrescenta itens à lista respeitando os limites do backend: trim, sem
// duplicados (ignora maiúsculas e acentos), até 40 caracteres e até 30 itens.
export function addIngredients(current: string[], rawItems: string[]): AddIngredientsResult {
  const list = [...current]
  const keys = new Set(list.map(comparisonKey))
  const duplicates: string[] = []
  const tooLong: string[] = []
  let hitLimit = false

  for (const raw of rawItems) {
    const item = raw.trim()
    if (!item) continue

    if (item.length > MAX_INGREDIENT_LENGTH) {
      tooLong.push(item)
      continue
    }

    const key = comparisonKey(item)
    if (keys.has(key)) {
      duplicates.push(item)
      continue
    }

    if (list.length >= MAX_INGREDIENTS) {
      hitLimit = true
      continue
    }

    keys.add(key)
    list.push(item)
  }

  const messages: string[] = []
  if (hitLimit) messages.push(`Máximo de ${MAX_INGREDIENTS} ingredientes por produto.`)
  if (tooLong.length > 0) {
    messages.push(
      `Cada ingrediente pode ter até ${MAX_INGREDIENT_LENGTH} caracteres. Não entrou: ${tooLong
        .map((item) => `"${item.slice(0, 20)}…"`)
        .join(", ")}.`
    )
  }
  if (duplicates.length > 0) messages.push(`Já estava na lista: ${duplicates.join(", ")}.`)

  return { list, messages }
}

// "Pão, hambúrguer, ovo, alface e tomate" -> [Pão, Hambúrguer, Ovo, Alface, Tomate].
// Divide por vírgula e pelo último " e ", faz trim, põe a primeira letra em
// maiúscula e descarta vazios e duplicados.
export function ingredientsFromDescription(description: string): string[] {
  const text = description.trim().replace(/[.\s]+$/, "")
  if (!text) return []

  const parts = text.split(",").map((part) => part.trim())

  const last = parts[parts.length - 1] ?? ""
  const andIndex = last.toLowerCase().lastIndexOf(" e ")
  if (andIndex > 0) {
    parts[parts.length - 1] = last.slice(0, andIndex).trim()
    parts.push(last.slice(andIndex + 3).trim())
  }

  const seen = new Set<string>()
  const items: string[] = []

  for (const part of parts) {
    if (!part) continue

    const item = part.charAt(0).toUpperCase() + part.slice(1)
    const key = comparisonKey(item)
    if (seen.has(key)) continue

    seen.add(key)
    items.push(item)
  }

  return items
}

export function countLabel(count: number): string {
  return `${count} ${count === 1 ? "ingrediente" : "ingredientes"}`
}
