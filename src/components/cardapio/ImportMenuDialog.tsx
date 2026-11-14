import { useEffect, useRef, useState } from "react"
import axios from "axios"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { confirmMenuImport, previewMenuImport } from "@/services/menuImport"
import type { Category, MenuImportPreview, MenuImportResult } from "@/types"
import { ReviewStep } from "./ReviewStep"
import { UploadStep, type UploadState } from "./UploadStep"
import {
  applyButtonText,
  buildDraft,
  buildPlan,
  importErrorMessage,
  plural,
  type ImportDraft,
} from "./importDraft"

type Step = "upload" | "reading" | "review" | "result"

const EMPTY_UPLOAD: UploadState = { tab: "photo", file: null, text: "" }

const TITLES: Record<Step, string> = {
  upload: "Importar cardápio com IA",
  reading: "Lendo seu cardápio...",
  review: "Revisar importação",
  result: "Importação concluída",
}

interface ImportMenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  // Recarrega a lista do Cardápio depois de aplicar as mudanças.
  onApplied: () => void | Promise<void>
}

export function ImportMenuDialog({ open, onOpenChange, categories, onApplied }: ImportMenuDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [upload, setUpload] = useState<UploadState>(EMPTY_UPLOAD)
  const [uploadError, setUploadError] = useState("")
  const [preview, setPreview] = useState<MenuImportPreview | null>(null)
  const [draft, setDraft] = useState<ImportDraft | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState("")
  const [result, setResult] = useState<MenuImportResult | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Foco no título a cada troca de etapa, para leitores de tela anunciarem a mudança.
  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [step, open])

  // Fechar descarta tudo: nem a imagem nem o texto ficam guardados.
  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    setStep("upload")
    setUpload(EMPTY_UPLOAD)
    setUploadError("")
    setPreview(null)
    setDraft(null)
    setApplying(false)
    setApplyError("")
    setResult(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (applying) return
      reset()
    }
    onOpenChange(next)
  }

  const canRead = upload.tab === "photo" ? Boolean(upload.file) : upload.text.trim().length > 0

  async function handleRead() {
    if (!canRead) return
    const controller = new AbortController()
    abortRef.current = controller
    setUploadError("")
    setStep("reading")

    try {
      const source =
        upload.tab === "photo" && upload.file
          ? ({ kind: "image", file: upload.file } as const)
          : ({ kind: "text", text: upload.text.trim() } as const)
      const response = await previewMenuImport(source, controller.signal)
      setPreview(response.data)
      setDraft(buildDraft(response.data, categories))
      setApplyError("")
      setStep("review")
    } catch (error) {
      if (axios.isCancel(error)) return
      setUploadError(importErrorMessage(error))
      setStep("upload")
    } finally {
      abortRef.current = null
    }
  }

  function handleCancelReading() {
    abortRef.current?.abort()
    abortRef.current = null
    setStep("upload")
  }

  const plan = draft ? buildPlan(draft) : null
  const nothingToDo = preview ? preview.summary.new + preview.summary.changed + preview.summary.similar === 0 : false
  const canApply = Boolean(plan) && plan!.items.length > 0 && plan!.blockers === 0 && plan!.pendingDecisions === 0

  async function handleApply() {
    if (!plan || !canApply) return
    try {
      setApplying(true)
      setApplyError("")
      const response = await confirmMenuImport(plan.items)
      setResult(response.data)
      setStep("result")
      // O Dialog já mostra o resultado; a lista de trás atualiza sem recarregar a página.
      await onApplied()
    } catch (error) {
      setApplyError(importErrorMessage(error))
    } finally {
      setApplying(false)
    }
  }

  function backToUpload() {
    setPreview(null)
    setDraft(null)
    setApplyError("")
    setStep("upload")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none p-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {TITLES[step]}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie uma foto do cardápio ou cole o texto. Nada é salvo antes da sua confirmação."}
            {step === "reading" && "Isso pode levar até 30 segundos."}
            {step === "review" && "Confira o que a IA encontrou e escolha o que aplicar."}
            {step === "result" && "Suas mudanças foram aplicadas."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {step === "upload" && (
            <UploadStep value={upload} onChange={setUpload} error={uploadError} onErrorChange={setUploadError} />
          )}

          {step === "reading" && (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Lendo seu cardápio...</p>
              <p className="text-xs text-muted-foreground">Estamos identificando os produtos e comparando com o que você já tem.</p>
            </div>
          )}

          {step === "review" && preview && draft && (
            <ReviewStep summary={preview.summary} draft={draft} onDraftChange={setDraft} />
          )}

          {step === "result" && result && (
            <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="text-sm font-medium text-foreground">
                {plural(result.created, "produto criado", "produtos criados")}, {result.updated} atualizado
                {result.updated === 1 ? "" : "s"}, {result.skipped} pulado{result.skipped === 1 ? "" : "s"}.
              </p>
              {result.categoriesCreated > 0 && (
                <p className="text-xs text-muted-foreground">
                  {plural(result.categoriesCreated, "categoria nova criada", "categorias novas criadas")}.
                </p>
              )}
              {result.created > 0 && (
                <p className="max-w-sm text-xs text-muted-foreground">
                  Os produtos novos entram sem foto. Que tal adicionar as imagens depois para o cardápio ficar mais atrativo?
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border p-4">
          {step === "review" && !nothingToDo && plan && (
            <>
              {applyError && (
                <p role="alert" className="text-xs text-destructive">
                  {applyError}
                </p>
              )}
              {(plan.pendingDecisions > 0 || plan.blockers > 0) && (
                <p className="text-xs text-amber-700">
                  {plan.pendingDecisions > 0 && `${plural(plan.pendingDecisions, "item parecido espera", "itens parecidos esperam")} decisão. `}
                  {plan.blockers > 0 && `${plural(plan.blockers, "item marcado precisa", "itens marcados precisam")} de correção ou deve ser desmarcado.`}
                </p>
              )}
            </>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {step === "upload" && (
              <>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleRead} disabled={!canRead}>
                  Ler cardápio
                </Button>
              </>
            )}

            {step === "reading" && (
              <Button type="button" variant="outline" onClick={handleCancelReading}>
                Cancelar leitura
              </Button>
            )}

            {step === "review" && nothingToDo && (
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            )}

            {step === "review" && !nothingToDo && plan && (
              <>
                <Button type="button" variant="outline" onClick={backToUpload} disabled={applying}>
                  Voltar
                </Button>
                <Button type="button" onClick={handleApply} disabled={!canApply || applying}>
                  {applying ? "Aplicando..." : plan.items.length > 0 ? applyButtonText(plan) : "Nada para aplicar"}
                </Button>
              </>
            )}

            {step === "result" && (
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Ver cardápio
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
