import type { OrderStatus } from "@/types"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo",
  preparo: "Em preparo",
  transporte: "Em transporte",
  entregue: "Entregue",
  cancelado: "Cancelado",
}

// Cor por status, reaproveitada no badge da tabela e no detalhe do pedido.
export const ORDER_STATUS_BADGE_CLASSNAME: Record<OrderStatus, string> = {
  novo: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  preparo: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  transporte: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  entregue: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelado: "bg-destructive/10 text-destructive",
}

const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  novo: { label: "Iniciar preparo", status: "preparo" },
  preparo: { label: "Saiu para entrega", status: "transporte" },
  transporte: { label: "Marcar como entregue", status: "entregue" },
}

// Único lugar que conhece a máquina de estados dos pedidos (espelha a validação
// já feita no backend) — Kanban, tabela e detalhe do pedido usam essas funções
// em vez de repetir a lógica de transição cada um do seu jeito.
export function getNextOrderAction(status: OrderStatus): { label: string; status: OrderStatus } | null {
  return NEXT_STATUS_ACTION[status] ?? null
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === "novo" || status === "preparo" || status === "transporte"
}
