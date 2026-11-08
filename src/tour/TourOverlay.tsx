import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ExternalLink, Link2, ListOrdered, MapPin, ShoppingBag, SlidersHorizontal, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/contexts/TenantContext"
import { getStoreUrl } from "@/lib/storeUrl"
import { computePlacement, type Box, type Size } from "@/tour/placement"
import { resolveSelector, type ResolvedStep } from "@/tour/steps"
import { useTour } from "@/tour/useTour"

const MOBILE_QUERY = "(max-width: 767px)"
const HIGHLIGHT_PADDING = 6
const WAIT_FOR_TARGET_MS = 1400

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function readBox(element: Element | null): Box | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null // invisível = como se não existisse
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height))

const CLIENT_STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShoppingBag, title: "Escolhe o produto", text: "Navega pelo cardápio da sua loja." },
  { icon: SlidersHorizontal, title: "Monta do jeito que quer", text: "Tira ingredientes e inclui adicionais." },
  { icon: MapPin, title: "Informa os dados", text: "Nome, endereço e forma de pagamento." },
  { icon: ListOrdered, title: "O pedido chega aqui", text: "Aparece em Pedidos, pronto para você preparar." },
]

function ClientIllustration() {
  return (
    <ol className="flex flex-col gap-2" aria-label="Como o cliente faz o pedido">
      {CLIENT_STEPS.map(({ icon: Icon, title, text }, i) => (
        <li key={title} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">
              {i + 1}. {title}
            </span>
            <span className="text-xs text-muted-foreground">{text}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback para navegadores/contextos sem a API moderna.
    try {
      const field = document.createElement("textarea")
      field.value = text
      field.setAttribute("readonly", "")
      field.style.position = "fixed"
      field.style.opacity = "0"
      document.body.appendChild(field)
      field.select()
      const ok = document.execCommand("copy")
      field.remove()
      return ok
    } catch {
      return false
    }
  }
}

function StoreLinkActions() {
  const { tenant } = useTenant()
  const url = getStoreUrl(tenant)
  const [feedback, setFeedback] = useState<"" | "ok" | "erro">("")

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(""), 2500)
    return () => window.clearTimeout(timer)
  }, [feedback])

  if (!url) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-lg bg-muted px-3 py-2 text-xs text-foreground">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={async () => setFeedback((await copyToClipboard(url)) ? "ok" : "erro")}
        >
          {feedback === "ok" ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          Copiar link da loja
        </Button>
        <Button type="button" variant="outline" size="sm" asChild className="min-h-10">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
            Abrir minha loja
          </a>
        </Button>
      </div>
      <p role="status" className="min-h-4 text-xs font-medium text-foreground">
        {feedback === "ok" && "Link copiado!"}
        {feedback === "erro" && "Não foi possível copiar. Selecione o endereço acima e copie."}
      </p>
    </div>
  )
}

interface StepViewProps {
  step: ResolvedStep
  index: number
  total: number
  isMobile: boolean
}

// Um passo: destaca o alvo (se existir e estiver visível) e posiciona o balão.
// Remonta a cada passo (key), então o estado de espera/posição recomeça limpo.
function StepView({ step, index, total, isMobile }: StepViewProps) {
  const { next, back, stopTour } = useTour()
  const selector = resolveSelector(step, isMobile)

  const [target, setTarget] = useState<Box | null>(null)
  const [waited, setWaited] = useState(selector === null)
  const [size, setSize] = useState<Size>({ width: 360, height: 240 })
  const [viewport, setViewport] = useState<Size>({ width: window.innerWidth, height: window.innerHeight })
  const scrolledRef = useRef(false)
  const balloonRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  const measure = useCallback(() => {
    setViewport((current) =>
      current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight }
    )

    const element = selector ? document.querySelector(selector) : null
    const box = readBox(element)

    // Leva o alvo para a vista na primeira vez que ele aparece.
    if (element && box && !scrolledRef.current) {
      scrolledRef.current = true
      const inView = box.top >= 0 && box.top + box.height <= window.innerHeight
      if (!inView) element.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" })
    }

    setTarget((current) => (sameBox(current, box) ? current : box))
    if (box) setWaited(true)
  }, [selector])

  // Acompanha rolagem, redimensionamento e mudanças de layout (a página nova
  // pode ainda estar carregando quando o passo começa).
  useEffect(() => {
    measure()
    const interval = window.setInterval(measure, 200)
    const giveUp = window.setTimeout(() => setWaited(true), WAIT_FOR_TARGET_MS)

    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(giveUp)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [measure])

  useLayoutEffect(() => {
    const node = balloonRef.current
    if (!node) return

    const update = () => {
      const rect = node.getBoundingClientRect()
      setSize((current) =>
        Math.round(current.width) === Math.round(rect.width) && Math.round(current.height) === Math.round(rect.height)
          ? current
          : { width: rect.width, height: rect.height }
      )
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // O foco vai para o botão principal assim que o balão aparece.
  useEffect(() => {
    if (waited) primaryRef.current?.focus({ preventScroll: true })
  }, [waited])

  const highlight: Box | null = target && {
    left: target.left - HIGHLIGHT_PADDING,
    top: target.top - HIGHLIGHT_PADDING,
    width: target.width + HIGHLIGHT_PADDING * 2,
    height: target.height + HIGHLIGHT_PADDING * 2,
  }

  const placement = computePlacement(highlight, size, viewport, {
    sides: isMobile ? ["bottom", "top"] : ["bottom", "top", "right", "left"],
  })

  const isFirst = index === 0
  const isLast = index === total - 1
  const titleId = `tour-title-${step.id}`
  const textId = `tour-text-${step.id}`

  function trapTab(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")
    )
    if (focusable.length === 0) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" data-tour-layer>
      {/* Bloqueia cliques na página enquanto o tour está aberto. */}
      <div className="absolute inset-0" aria-hidden />

      {highlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary"
          style={{
            left: highlight.left,
            top: highlight.top,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.62)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/60" />
      )}

      <div
        ref={balloonRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        onKeyDown={trapTab}
        className="absolute flex max-h-[calc(100dvh-24px)] w-[min(calc(100vw-24px),380px)] flex-col gap-3 overflow-y-auto rounded-2xl bg-card p-4 text-card-foreground shadow-2xl ring-1 ring-border motion-safe:transition-opacity motion-safe:duration-200"
        style={{ left: placement.left, top: placement.top, opacity: waited ? 1 : 0 }}
      >
        <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Passo {index + 1} de {total}
            </p>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
          </div>
          <h2 id={titleId} className="font-heading text-lg font-semibold leading-snug text-foreground">
            {step.title}
          </h2>
          <p id={textId} className="text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </div>

        {step.illustration === "cliente-pede" && <ClientIllustration />}
        {step.extras === "store-link" && <StoreLinkActions />}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => stopTour("dismissed")}
            className="min-h-10 rounded-md px-1 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Pular tutorial
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={back} disabled={isFirst} className="min-h-10">
              Voltar
            </Button>
            <Button ref={primaryRef} type="button" onClick={next} className="min-h-10">
              {isLast ? (step.finishLabel ?? "Concluir") : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Montado uma vez enquanto o tour está aberto: isola a página, trata o teclado
// e troca o passo.
function TourSession() {
  const { steps, index, next, back, stopTour } = useTour()
  const isMobile = useIsMobile()
  const step = steps[index]

  // A página fica inerte (sem foco nem leitor de tela) enquanto o tour está
  // aberto; o balão mora fora do #root, então continua acessível.
  useEffect(() => {
    const root = document.getElementById("root")
    if (!root) return
    root.inert = true
    return () => {
      root.inert = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        stopTour("dismissed")
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        next()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        back()
      } else if (event.key === "Enter") {
        // Em botões e links o Enter já faz a própria ação.
        const focused = document.activeElement
        if (!(focused instanceof HTMLButtonElement) && !(focused instanceof HTMLAnchorElement)) {
          event.preventDefault()
          next()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, true)
    return () => document.removeEventListener("keydown", onKeyDown, true)
  }, [next, back, stopTour])

  if (!step) return null

  return <StepView key={step.id} step={step} index={index} total={steps.length} isMobile={isMobile} />
}

export function TourOverlay() {
  const { active } = useTour()

  if (!active) return null

  return createPortal(<TourSession />, document.body)
}
