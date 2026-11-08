// Posicionamento do balão do tutorial em relação ao alvo. Funções puras (sem DOM)
// para ficarem fáceis de testar.

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export type Side = "bottom" | "top" | "right" | "left"

export interface Placement {
  left: number
  top: number
  side: Side | "center" | "fallback"
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

function overlaps(a: Box, b: Box) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top
}

// `target` já deve vir com a folga do destaque. `margin` é a distância mínima
// das bordas da tela e `gap` a distância entre o balão e o alvo.
export function computePlacement(
  target: Box | null,
  balloon: Size,
  viewport: Size,
  { margin = 12, gap = 14, sides = ["bottom", "top", "right", "left"] as Side[] } = {}
): Placement {
  const centered: Placement = {
    left: Math.round((viewport.width - balloon.width) / 2),
    top: Math.round((viewport.height - balloon.height) / 2),
    side: "center",
  }

  if (!target) return centered

  const maxLeft = viewport.width - margin - balloon.width
  const maxTop = viewport.height - margin - balloon.height

  const candidates: Record<Side, Placement> = {
    bottom: {
      left: clamp(target.left + target.width / 2 - balloon.width / 2, margin, maxLeft),
      top: target.top + target.height + gap,
      side: "bottom",
    },
    top: {
      left: clamp(target.left + target.width / 2 - balloon.width / 2, margin, maxLeft),
      top: target.top - gap - balloon.height,
      side: "top",
    },
    right: {
      left: target.left + target.width + gap,
      top: clamp(target.top + target.height / 2 - balloon.height / 2, margin, maxTop),
      side: "right",
    },
    left: {
      left: target.left - gap - balloon.width,
      top: clamp(target.top + target.height / 2 - balloon.height / 2, margin, maxTop),
      side: "left",
    },
  }

  const fits = (placement: Placement) =>
    placement.left >= margin - 0.5 &&
    placement.top >= margin - 0.5 &&
    placement.left + balloon.width <= viewport.width - margin + 0.5 &&
    placement.top + balloon.height <= viewport.height - margin + 0.5 &&
    !overlaps({ left: placement.left, top: placement.top, ...balloon }, target)

  for (const side of sides) {
    const placement = candidates[side]
    if (fits(placement)) return { ...placement, left: Math.round(placement.left), top: Math.round(placement.top) }
  }

  // Nada coube sem cobrir o alvo (alvo muito grande): encosta o balão na borda
  // da tela com mais espaço livre, sempre inteiro dentro da tela.
  const spaceAbove = target.top
  const spaceBelow = viewport.height - (target.top + target.height)
  const top = spaceBelow >= spaceAbove ? maxTop : margin

  return { left: Math.round(clamp((viewport.width - balloon.width) / 2, margin, maxLeft)), top: Math.round(top), side: "fallback" }
}
