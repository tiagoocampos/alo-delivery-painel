import type { Product, ProductExtra, ProductVariant } from "@/types"

export interface CartLine {
  key: string
  kind: "product" | "custom"
  name: string
  detail?: string
  unitPrice: number // centavos (estimado para produto; o total oficial vem da API)
  quantity: number
  productId?: string
  variantId?: string
  extraIds?: string[]
}

// Mesmo cálculo do backend: basePrice + variante + extras.
export function computeUnitPrice(product: Product, variant?: ProductVariant | null, extras: ProductExtra[] = []) {
  return (
    (product.basePrice ?? 0) +
    (variant?.priceDelta ?? 0) +
    extras.reduce((sum, extra) => sum + extra.price, 0)
  )
}

export function buildProductLine(
  product: Product,
  variant: ProductVariant | null,
  extras: ProductExtra[]
): CartLine {
  const extraIds = extras.map((extra) => extra.id).sort()
  const details = [variant?.name, ...extras.map((extra) => `+ ${extra.name}`)].filter(Boolean)
  return {
    key: `p:${product.id}:${variant?.id ?? ""}:${extraIds.join(",")}`,
    kind: "product",
    name: product.name,
    detail: details.length > 0 ? details.join(", ") : undefined,
    unitPrice: computeUnitPrice(product, variant, extras),
    quantity: 1,
    productId: product.id,
    variantId: variant?.id,
    extraIds,
  }
}

export function buildCustomLine(name: string, unitPrice: number, quantity: number): CartLine {
  return { key: `c:${crypto.randomUUID()}`, kind: "custom", name, unitPrice, quantity }
}

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((item) => item.key === line.key)
  if (!existing) return [...lines, line]
  return lines.map((item) =>
    item.key === line.key ? { ...item, quantity: item.quantity + line.quantity } : item
  )
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}
