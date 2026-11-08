import { useContext } from "react"
import { TourContext } from "@/tour/tourContext"

export function useTour() {
  const context = useContext(TourContext)

  if (!context) {
    throw new Error("useTour deve ser usado dentro de um TourProvider")
  }

  return context
}
