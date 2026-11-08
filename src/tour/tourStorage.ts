// Estado do tutorial por usuário, só no aparelho (localStorage). Tudo com
// try/catch: se o armazenamento falhar, o painel continua funcionando.

export type TourStatus = "invited" | "dismissed" | "completed"

export interface TourState {
  status: TourStatus
  at: string
}

const keyFor = (userId: string) => `tour:${userId}`

export function readTourState(userId: string): TourState | null {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<TourState>
    if (parsed.status === "invited" || parsed.status === "dismissed" || parsed.status === "completed") {
      return { status: parsed.status, at: parsed.at ?? "" }
    }
  } catch {
    // valor corrompido ou armazenamento indisponível: trata como "nunca viu".
  }
  return null
}

export function writeTourState(userId: string, status: TourStatus) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ status, at: new Date().toISOString() }))
  } catch {
    // sem armazenamento: no máximo o convite reaparece no próximo acesso.
  }
}
