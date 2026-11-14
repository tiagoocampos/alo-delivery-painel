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

export type EffectivePlan = "completo" | "basico"

export interface TenantSubscription {
  status: string // ex: "trial", "active", ...
  startedAt: string
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
  pixKey: string | null
  minimumOrderValue: number
  businessHours: BusinessHourEntry[] | null
  effectivePlan: EffectivePlan
  subscription?: TenantSubscription | null
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

export interface ProductExtra {
  id: string
  name: string
  price: number // centavos
}

export interface ProductCategorySummary {
  id: string
  name: string
  sortOrder: number
}

export type ProductBadge = "mais_pedido" | "promocao" | "novo"

export type ProductAvailability = "ambos" | "delivery" | "balcao"

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
  availability: ProductAvailability
  // Ingredientes padrão (o cliente pode tirar). Respostas antigas podem não trazer: tratar como [].
  ingredients?: string[]
  createdAt: string
  updatedAt: string
  category: ProductCategorySummary
  variants: ProductVariant[]
  extras: ProductExtra[]
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

export type CanceledBy = "customer" | "store"

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
  cancelReason: string | null
  canceledBy: CanceledBy | null
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
  onlineRevenue?: number
  balcaoRevenue?: number
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

export type PosPaymentMethod = "dinheiro" | "pix" | "cartao_debito" | "cartao_credito"

export type PosSaleItemInput =
  | { type: "product"; productId: string; variantId?: string; extraIds?: string[]; quantity: number }
  | { type: "custom"; name: string; unitPrice: number; quantity: number }

export interface PosSaleInput {
  clientId: string
  paymentMethod: PosPaymentMethod
  items: PosSaleItemInput[]
}

export interface PosSale {
  id: string
  tableLabel: string | null // null = venda rápida (sem mesa)
  createdAt: string
  closedAt: string | null
  status: string // "concluida" | "cancelada" (o backend marca cancelada via status ou cancelReason)
  paymentMethod: PosPaymentMethod
  total: number
  cancelReason: string | null
  items: { name: string; quantity: number; unitPrice: number }[]
}

export interface PosSalesSummary {
  totalSales: number
  totalRevenue: number
  byPaymentMethod: { paymentMethod: PosPaymentMethod; count: number; total: number }[]
}

export interface PosSalesResponse {
  date: string
  sales: PosSale[]
  summary: PosSalesSummary
}

export interface PosTableSummary {
  id: string
  label: string
  openedAt: string
  itemsCount: number
  total: number
}

export interface PosTableItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  extras: { name: string; price: number }[]
}

export interface PosTableDetail {
  id: string
  label: string
  status: string
  openedAt: string
  closedAt: string | null
  paymentMethod: PosPaymentMethod | null
  subtotal: number
  total: number
  items: PosTableItem[]
}

export type MenuImportStatus = "new" | "unchanged" | "changed" | "similar"

export type MenuImportWarning = "CATEGORY_HAS_SIZES" | "PRICE_UNREADABLE" | "PRODUCT_INACTIVE"

export type MenuImportChangeField = "price" | "description" | "ingredients"

export interface MenuImportProductRef {
  productId: string
  name: string
  priceCents: number | null
}

export interface MenuImportChange {
  field: MenuImportChangeField
  from: number | string | string[] | null
  to: number | string | string[] | null
}

export interface MenuImportItem {
  tempId: string
  status: MenuImportStatus
  extracted: {
    name: string
    description: string | null
    priceCents: number | null
    categoryName: string
    categoryId: string | null
    ingredients: string[]
    availability: ProductAvailability
  }
  match: MenuImportProductRef | null
  changes: MenuImportChange[]
  candidates: MenuImportProductRef[]
  warnings: MenuImportWarning[]
}

export interface MenuImportPreview {
  summary: { new: number; unchanged: number; changed: number; similar: number; total: number }
  categories: { name: string; categoryId: string | null; isNew: boolean; hasSizes: boolean }[]
  items: MenuImportItem[]
}

export type MenuImportConfirmItem =
  | {
      action: "create"
      name: string
      description?: string
      priceCents: number
      categoryId?: string
      newCategoryName?: string
      ingredients?: string[]
      availability: ProductAvailability
    }
  | {
      action: "update"
      productId: string
      fields: {
        priceCents?: number
        description?: string
        ingredients?: string[]
        availability?: ProductAvailability
      }
    }

export interface MenuImportResult {
  created: number
  updated: number
  skipped: number
  categoriesCreated: number
}
