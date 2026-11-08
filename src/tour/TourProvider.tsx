import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import { useTenant } from "@/contexts/TenantContext"
import { TourContext, type TourContextValue } from "@/tour/tourContext"
import { buildSteps, type ResolvedStep } from "@/tour/steps"
import { readTourState, writeTourState } from "@/tour/tourStorage"

const INVITE_DELAY_MS = 1500
const MOBILE_QUERY = "(max-width: 767px)"

// Fica ACIMA das rotas (cada página monta o próprio AppLayout, que remonta a
// cada troca de rota): é o único jeito de o tour manter o passo atual enquanto
// navega entre Painel, Cardápio, Pedidos...
export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { tenant } = useTenant()

  // Relido a cada rota: pega o usuário logo depois do login e o descarta no logout.
  const user = useMemo(() => getStoredUser(), [pathname])

  const [steps, setSteps] = useState<ResolvedStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [pendingInvite, setPendingInvite] = useState(false)

  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  // `focusKey` é o data-tour do elemento que tinha o foco: a página de origem é
  // remontada ao navegar, então o elemento antigo some e achamos o equivalente.
  const origin = useRef<{ path: string; focus: HTMLElement | null; focusKey: string | null } | null>(null)
  // Usuário para o qual o convite já foi decidido nesta sessão.
  const inviteDecidedFor = useRef<string | null>(null)

  const active = steps !== null

  const restoreFocus = useCallback(() => {
    const target = origin.current?.focus
    const focusKey = origin.current?.focusKey
    origin.current = null

    window.setTimeout(() => {
      if (target && target.isConnected) {
        target.focus()
        return
      }

      const equivalent = focusKey ? document.querySelector<HTMLElement>(`[data-tour="${focusKey}"]`) : null
      if (equivalent && equivalent.getBoundingClientRect().width > 0) {
        equivalent.focus()
        return
      }
      // O elemento de origem sumiu (ex.: o botão do convite): foco no conteúdo.
      const main = document.querySelector<HTMLElement>("main")
      if (main) {
        main.setAttribute("tabindex", "-1")
        main.focus({ preventScroll: true })
      }
    }, 250)
  }, [])

  const startTour = useCallback(() => {
    if (steps) return

    const built = buildSteps({
      isOwner: isStoreOwner(user),
      plan: tenant?.effectivePlan ?? "completo",
      isMobile: window.matchMedia(MOBILE_QUERY).matches,
    })

    const focused = document.activeElement as HTMLElement | null
    origin.current = {
      path: pathnameRef.current,
      focus: focused,
      focusKey: focused?.getAttribute?.("data-tour") ?? null,
    }
    setPendingInvite(false)
    setIndex(0)
    setSteps(built)
  }, [steps, user, tenant?.effectivePlan])

  const stopTour = useCallback(
    (status: "dismissed" | "completed") => {
      if (user) writeTourState(user.id, status)

      // Volta ao ponto de partida.
      const startedAt = origin.current?.path
      setSteps(null)
      if (startedAt && pathnameRef.current !== startedAt) navigate(startedAt)
      restoreFocus()
    },
    [user, navigate, restoreFocus]
  )

  const next = useCallback(() => {
    if (!steps) return
    if (index >= steps.length - 1) stopTour("completed")
    else setIndex(index + 1)
  }, [steps, index, stopTour])

  const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), [])

  const dismissInvite = useCallback(() => {
    if (user) writeTourState(user.id, "dismissed")
    setPendingInvite(false)
  }, [user])

  // Cada passo navega sozinho até a página dele.
  const step = steps?.[index]
  const stepRoute = step?.route
  useEffect(() => {
    if (stepRoute && stepRoute !== pathnameRef.current) navigate(stepRoute)
  }, [stepRoute, step?.id, navigate])

  // Convite: só na tela inicial, só para quem nunca respondeu, ~1,5 s depois de
  // carregar, uma única vez por usuário (e por navegador).
  const userId = user?.id
  useEffect(() => {
    if (!userId || pathname !== "/" || active) return
    if (inviteDecidedFor.current === userId) return

    if (readTourState(userId)) {
      inviteDecidedFor.current = userId
      return
    }

    const timer = window.setTimeout(() => {
      inviteDecidedFor.current = userId
      writeTourState(userId, "invited")
      setPendingInvite(true)
    }, INVITE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [userId, pathname, active])

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      steps: steps ?? [],
      index,
      startTour,
      stopTour,
      next,
      back,
      pendingInvite,
      dismissInvite,
    }),
    [active, steps, index, startTour, stopTour, next, back, pendingInvite, dismissInvite]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
