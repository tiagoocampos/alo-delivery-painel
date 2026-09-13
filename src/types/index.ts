export type UserRole = "store_owner" | "store_staff"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId: string
}

export interface BusinessHourEntry {
  dayOfWeek: number // 0 = domingo ... 6 = sábado
  isClosed: boolean
  opensAt: string | null // "HH:mm"
  closesAt: string | null // "HH:mm"
}

export interface Tenant {
  id: string
  name: string
  slug: string
  phone: string | null
  deliveryFee: number
  isActive: boolean
  logoUrl: string | null
  bannerUrl: string | null
  faviconUrl: string | null
  description: string | null
  address: string | null
  instagramUrl: string | null
  minimumOrderValue: number
  businessHours: BusinessHourEntry[] | null
}

export interface CategorySize {
  id: string
  name: string
  price: number // centavos
  maxFlavors: number
}

export interface CategoryCrust {
  id: string
  name: string
  priceDelta: number // centavos
}

export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  sizes: CategorySize[]
  crusts: CategoryCrust[]
}

export interface ProductVariant {
  id: string
  name: string
  priceDelta: number
}

export interface ProductCategorySummary {
  id: string
  name: string
  sortOrder: number
}

export type ProductBadge = "mais_pedido" | "promocao" | "novo"

export interface Product {
  id: string
  tenantId: string
  categoryId: string
  name: string
  description: string | null
  imageUrl: string | null
  basePrice: number | null
  isActive: boolean
  badge: ProductBadge | null
  createdAt: string
  updatedAt: string
  category: ProductCategorySummary
  variants: ProductVariant[]
}

export type OrderStatus = "novo" | "preparo" | "transporte" | "entregue" | "cancelado"

export type PaymentMethod = "pix_manual" | "na_entrega"

export interface OrderItemFlavor {
  id: string
  productId: string
  productName: string
}

export interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  note: string | null
  // "Item normal" (produto de categoria sem tamanho): product preenchido.
  // "Item tamanho+sabores" (produto de categoria com tamanho, ex: pizza):
  // product é null; categorySize, categoryCrust e flavors é que descrevem o item.
  product: { id: string; name: string; imageUrl?: string | null } | null
  variant: { id: string; name: string; priceDelta?: number } | null
  categorySize: { id: string; name: string; price?: number; category: { name: string } } | null
  categoryCrust: { id: string; name: string; priceDelta?: number } | null
  flavors: OrderItemFlavor[]
}

export interface Order {
  id: string
  customerName: string
  customerPhone: string
  address: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt?: string
  items: OrderItem[]
}

export interface LoyaltyUpdate {
  pointsEarned: number
  pointsBalance: number
}

export interface UpdateOrderStatusResult {
  id: string
  tenantId: string
  customerName: string
  customerPhone: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  total: number
  updatedAt: string
  loyalty?: LoyaltyUpdate
}

export interface OrdersSummary {
  totalOrders: number
  totalRevenue: number
  averageTicket: number
  totalOrdersIncludingCancelled: number
}

export interface DashboardMonthSummary {
  totalRevenue: number
  totalOrders: number
}

export interface DashboardSummary {
  currentMonth: DashboardMonthSummary
  previousMonth: DashboardMonthSummary
}

export interface DashboardRevenuePoint {
  date: string // "YYYY-MM-DD"
  totalRevenue: number
  totalOrders: number
}

export interface DashboardTopProduct {
  productId: string
  productName: string
  totalQuantity: number
}
