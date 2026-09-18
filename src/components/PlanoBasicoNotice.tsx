import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const WHATSAPP_MESSAGE = "Olá! Quero saber mais sobre o plano completo do Alô Delivery."
const WHATSAPP_URL = `https://wa.me/5554999067417?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

interface PlanoBasicoNoticeProps {
  description: string
  reassurance: string
}

export function PlanoBasicoNotice({ description, reassurance }: PlanoBasicoNoticeProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Sparkles className="size-6" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Recurso do plano completo</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="gap-1.5">
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
          Falar sobre o plano completo
        </a>
      </Button>
      <p className="max-w-md text-xs text-muted-foreground">{reassurance}</p>
    </div>
  )
}
