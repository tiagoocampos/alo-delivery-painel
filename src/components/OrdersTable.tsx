import { useMemo, useState } from "react"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrderStatusBadge } from "@/components/OrderStatusBadge"
import { formatDate, formatPrice } from "@/lib/utils-api"
import { canCancelOrder, getNextOrderAction, ORDER_STATUS_LABELS } from "@/lib/orderStatus"
import type { Order, OrderStatus } from "@/types"

const PAYMENT_LABELS: Record<string, string> = {
  pix_manual: "Pix",
  na_entrega: "Na entrega",
}

const PAGE_SIZE = 20

interface OrdersTableProps {
  orders: Order[]
  updatingId: string | null
  onAdvance: (order: Order, status: OrderStatus) => void
  onCancel: (order: Order) => void
  onOpenDetail: (orderId: string) => void
}

function summarizeItems(order: Order): string {
  if (order.items.length === 0) return "—"
  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.categorySize ? item.categorySize.name : (item.product?.name ?? "Item")}`
    )
    .join(", ")
}

function SortableHeader({ label, column, align }: { label: string; column: Column<Order, unknown>; align?: "right" }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={align === "right" ? "-mr-2 ml-auto flex" : "-ml-2 flex"}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  )
}

export function OrdersTable({ orders, updatingId, onAdvance, onCancel, onOpenDetail }: OrdersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
  const [customerFilter, setCustomerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all")
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)

  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = []
    if (customerFilter) filters.push({ id: "customerName", value: customerFilter })
    if (statusFilter !== "all") filters.push({ id: "status", value: statusFilter })
    return filters
  }, [customerFilter, statusFilter])

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: ({ column }) => <SortableHeader label="Cliente" column={column} />,
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.customerName}</span>,
      },
      {
        id: "items",
        header: "Itens",
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original
          return (
            <span
              className="block max-w-64 truncate text-sm text-muted-foreground"
              title={summarizeItems(order)}
            >
              {order.items.length} {order.items.length === 1 ? "item" : "itens"} — {summarizeItems(order)}
            </span>
          )
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Forma de pagamento",
        enableSorting: false,
        cell: ({ row }) => PAYMENT_LABELS[row.original.paymentMethod] ?? row.original.paymentMethod,
      },
      {
        accessorKey: "total",
        header: ({ column }) => <SortableHeader label="Total" column={column} align="right" />,
        cell: ({ row }) => <span className="block text-right font-medium">{formatPrice(row.original.total)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, columnId, filterValue) => row.getValue(columnId) === filterValue,
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader label="Data/Hora" column={column} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original
          const nextAction = getNextOrderAction(order.status)
          const canCancel = canCancelOrder(order.status)
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Ações do pedido de ${order.customerName}`}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onOpenDetail(order.id)}>Ver detalhes</DropdownMenuItem>
                  {(nextAction || canCancel) && <DropdownMenuSeparator />}
                  {nextAction && (
                    <DropdownMenuItem
                      disabled={updatingId === order.id}
                      onSelect={() => onAdvance(order, nextAction.status)}
                    >
                      {nextAction.label}
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={updatingId === order.id}
                      onSelect={() => setOrderToCancel(order)}
                    >
                      Cancelar pedido
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [updatingId, onAdvance, onOpenDetail]
  )

  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Buscar por nome do cliente..."
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="sm:w-64"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onOpenDetail(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)} (
          {table.getFilteredRowModel().rows.length} pedido(s))
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próxima
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(orderToCancel)}
        onOpenChange={(open) => {
          if (!open) setOrderToCancel(null)
        }}
        title="Cancelar pedido?"
        description={`O pedido de ${orderToCancel?.customerName} será marcado como cancelado. Essa ação não pode ser desfeita.`}
        confirmText="Cancelar pedido"
        destructive
        onConfirm={() => {
          if (orderToCancel) onCancel(orderToCancel)
          setOrderToCancel(null)
        }}
      />
    </div>
  )
}
