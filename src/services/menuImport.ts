import { api } from "@/services/api"
import type { MenuImportConfirmItem, MenuImportPreview, MenuImportResult } from "@/types"

// A leitura pela IA pode levar ~30 s; o limite do axios cobre esse caso com folga.
const PREVIEW_TIMEOUT_MS = 60_000

export type MenuImportSource = { kind: "image"; file: File } | { kind: "text"; text: string }

export function previewMenuImport(source: MenuImportSource, signal?: AbortSignal) {
  const formData = new FormData()
  if (source.kind === "image") formData.append("file", source.file)
  else formData.append("text", source.text)

  return api.post<MenuImportPreview>("/products/import/preview", formData, {
    signal,
    timeout: PREVIEW_TIMEOUT_MS,
  })
}

export function confirmMenuImport(items: MenuImportConfirmItem[]) {
  return api.post<MenuImportResult>("/products/import/confirm", { items })
}
