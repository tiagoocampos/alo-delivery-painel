import { Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInstallPrompt } from "@/contexts/InstallPromptContext"

export function InstallAppButton() {
  const { canInstall, isIos, isStandalone, promptInstall } = useInstallPrompt()

  if (isStandalone) return null

  if (canInstall) {
    return (
      <Button variant="outline" onClick={promptInstall} className="justify-start gap-2">
        <Download className="size-4" />
        Instalar app
      </Button>
    )
  }

  if (isIos) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Share className="mt-0.5 size-3.5 shrink-0" />
        <span>Para instalar: toque em Compartilhar e depois em Adicionar à Tela de Início.</span>
      </div>
    )
  }

  return null
}
