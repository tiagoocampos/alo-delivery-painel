import { useState } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
  addIngredients,
  ingredientsFromDescription,
  splitIngredientText,
} from "@/lib/ingredients"

interface IngredientsFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  // Descrição atual do formulário, usada por "Gerar a partir da descrição".
  description: string
}

export function IngredientsField({ value, onChange, description }: IngredientsFieldProps) {
  const [draft, setDraft] = useState("")
  const [message, setMessage] = useState("")
  const [pendingGenerated, setPendingGenerated] = useState<string[] | null>(null)

  function commit(rawItems: string[]) {
    const result = addIngredients(value, rawItems)
    if (result.list.length !== value.length) onChange(result.list)
    setMessage(result.messages.join(" "))
  }

  function commitDraft() {
    if (!draft.trim()) {
      setDraft("")
      return
    }
    commit([draft])
    setDraft("")
  }

  function handleInputChange(text: string) {
    // Vírgula digitada fecha o ingrediente; o que vem depois fica no campo.
    if (text.includes(",")) {
      const parts = splitIngredientText(text)
      const rest = parts.pop() ?? ""
      commit(parts)
      setDraft(rest.trimStart())
      return
    }
    setDraft(text)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text")
    if (!/[,\n\r]/.test(pasted)) return

    // Lista colada: adiciona todos de uma vez.
    event.preventDefault()
    commit(splitIngredientText(draft + pasted))
    setDraft("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Enter aqui adiciona o ingrediente, não envia o formulário do produto.
      event.preventDefault()
      commitDraft()
    }
  }

  function applyGenerated(items: string[]) {
    const result = addIngredients([], items)
    onChange(result.list)
    setMessage(result.messages.join(" "))
    setDraft("")
  }

  function handleGenerate() {
    const items = ingredientsFromDescription(description)

    if (items.length === 0) {
      setMessage("Escreva a descrição com os ingredientes separados por vírgula (ex: Pão, carne e queijo).")
      return
    }

    if (value.length > 0) {
      setPendingGenerated(items)
      return
    }

    applyGenerated(items)
  }

  function remove(item: string) {
    onChange(value.filter((current) => current !== item))
    setMessage("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="ingredient-input">Ingredientes (o cliente poderá tirar)</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_INGREDIENTS}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          id="ingredient-input"
          value={draft}
          maxLength={MAX_INGREDIENT_LENGTH}
          placeholder="Ex: Alface"
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={commitDraft}
        />
        <Button type="button" variant="outline" onClick={commitDraft} disabled={!draft.trim()}>
          Adicionar
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Ingredientes do produto">
          {value.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-2.5 pr-1 text-xs text-foreground"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Remover ${item}`}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={handleGenerate}>
        <Sparkles className="size-3.5" />
        Gerar a partir da descrição
      </Button>

      {message && (
        <p role="status" className="text-xs text-destructive">
          {message}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Opcional. Aparecem marcados na hora de montar o pedido; o cliente desmarca o que não quer. Remover um
        ingrediente não muda o preço.
      </p>

      <ConfirmDialog
        open={pendingGenerated !== null}
        onOpenChange={(open) => {
          if (!open) setPendingGenerated(null)
        }}
        title="Substituir os ingredientes?"
        description="A lista atual será trocada pela gerada a partir da descrição. Você ainda poderá ajustar antes de salvar."
        confirmText="Substituir"
        onConfirm={() => {
          if (pendingGenerated) applyGenerated(pendingGenerated)
          setPendingGenerated(null)
        }}
      />
    </div>
  )
}
