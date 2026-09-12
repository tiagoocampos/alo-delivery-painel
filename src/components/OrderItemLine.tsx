import type { OrderItem } from "@/types"

interface OrderItemLineProps {
  item: OrderItem
}

export function OrderItemLine({ item }: OrderItemLineProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {item.quantity}x{" "}
        {item.categorySize
          ? `${item.categorySize.category.name} - ${item.categorySize.name}`
          : (item.product?.name ?? "Item")}
        {item.variant ? ` (${item.variant.name})` : ""}
      </p>
      {item.flavors.length > 0 && (
        <p className="text-xs text-muted-foreground/80">
          Sabores: {item.flavors.map((flavor) => flavor.productName).join(", ")}
        </p>
      )}
      {item.categoryCrust && <p className="text-xs text-muted-foreground/80">Borda: {item.categoryCrust.name}</p>}
      {item.note && <p className="text-xs text-muted-foreground/80">Obs: {item.note}</p>}
    </div>
  )
}
