import { createContext } from "react"
import type { ResolvedStep } from "@/tour/steps"

export interface TourContextValue {
  // Tour em andamento (balão e recorte na tela).
  active: boolean
  steps: ResolvedStep[]
  index: number
  startTour: () => void
  stopTour: (status: "dismissed" | "completed") => void
  next: () => void
  back: () => void
  // Convite flutuante ("Primeira vez por aqui?") aguardando resposta.
  pendingInvite: boolean
  dismissInvite: () => void
}

export const TourContext = createContext<TourContextValue | null>(null)
