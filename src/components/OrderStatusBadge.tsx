import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ORDER_STATUS_BADGE_CLASSNAME, ORDER_STATUS_LABELS } from "@/lib/orderStatus"
import type { OrderStatus } from "@/types"

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-transparent", ORDER_STATUS_BADGE_CLASSNAME[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}
