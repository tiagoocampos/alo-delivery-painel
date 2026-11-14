import { useEffect, useState } from "react"
import { Camera, ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MAX_IMAGE_BYTES, MAX_TEXT_LENGTH } from "./importDraft"

export type UploadTab = "photo" | "text"

export interface UploadState {
  tab: UploadTab
  file: File | null
  text: string
}

interface UploadStepProps {
  value: UploadState
  onChange: (value: UploadState) => void
  error: string
  onErrorChange: (message: string) => void
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"]

export function UploadStep({ value, onChange, error, onErrorChange }: UploadStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value.file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value.file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value.file])

  function handleFile(file: File | null) {
    onErrorChange("")
    if (!file) {
      onChange({ ...value, file: null })
      return
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onChange({ ...value, file: null })
      onErrorChange("Use uma imagem JPG ou PNG.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onChange({ ...value, file: null })
      onErrorChange("A imagem pode ter no máximo 5 MB.")
      return
    }
    onChange({ ...value, file })
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={value.tab}
        onValueChange={(tab) => {
          onErrorChange("")
          onChange({ ...value, tab: tab as UploadTab })
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="photo">
            <Camera />
            Foto
          </TabsTrigger>
          <TabsTrigger value="text">Texto</TabsTrigger>
        </TabsList>

        <TabsContent value="photo" className="mt-2 flex flex-col gap-2">
          <Label htmlFor="import-menu-file">Foto do cardápio</Label>
          <Input
            id="import-menu-file"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Miniatura do cardápio selecionado"
              className="max-h-56 w-full rounded-lg border border-border object-contain"
            />
          ) : (
            <div className="flex h-28 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              <ImageIcon className="size-4" />
              JPG ou PNG, até 5 MB
            </div>
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="import-menu-text">Texto do cardápio</Label>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {value.text.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <Textarea
            id="import-menu-text"
            value={value.text}
            maxLength={MAX_TEXT_LENGTH}
            rows={8}
            placeholder={"X Bacon - 30,00\nX Salada - 25,00\nCoca-Cola 2L - 12,00"}
            onChange={(event) => {
              onErrorChange("")
              onChange({ ...value, text: event.target.value })
            }}
          />
        </TabsContent>
      </Tabs>

      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Fotografe com boa luz, de frente, sem sombra. Uma página por vez dá o melhor resultado.
      </p>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
