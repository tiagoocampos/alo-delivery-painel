import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTour } from "@/tour/useTour"

// Qualquer painel lateral ou modal aberto (Sheet, Dialog, AlertDialog do Radix).
const OPEN_OVERLAY = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'

function useOverlayOpen(enabled: boolean) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const check = () => setOpen(document.querySelector(OPEN_OVERLAY) !== null)
    check()
    const interval = window.setInterval(check, 400)
    return () => window.clearInterval(interval)
  }, [enabled])

  return enabled && open
}

// Convite discreto: nada escurece, nada trava, e o tour só começa se o lojista
// clicar em "Iniciar tutorial".
export function TourInvite() {
  const { pendingInvite, active, startTour, dismissInvite } = useTour()
  const { pathname } = useLocation()

  const eligible = pendingInvite && !active && pathname === "/"
  const overlayOpen = useOverlayOpen(eligible)
  const visible = eligible && !overlayOpen

  useEffect(() => {
    if (!visible) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.querySelector(OPEN_OVERLAY) === null) dismissInvite()
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [visible, dismissInvite])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="tour-invite-title"
      aria-describedby="tour-invite-text"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6 motion-safe:duration-500 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
    >
      <button
        type="button"
        onClick={dismissInvite}
        aria-label="Fechar convite do tutorial"
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="tour-invite-title" className="font-heading text-base font-semibold text-foreground">
            Primeira vez por aqui?
          </h2>
          <p id="tour-invite-text" className="text-sm leading-relaxed text-muted-foreground">
            Faça um tour rápido de 2 minutos e aprenda a montar seu cardápio, receber pedidos e divulgar sua loja.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" onClick={startTour} className="min-h-10 flex-1 sm:flex-none">
          Iniciar tutorial
        </Button>
        <Button type="button" variant="ghost" onClick={dismissInvite} className="min-h-10">
          Agora não
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Você pode abrir o tutorial quando quiser, pelo menu.</p>
    </div>
  )
}
