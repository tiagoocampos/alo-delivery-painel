import { useEffect, useState, type ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  ListOrdered,
  Menu,
  Package,
  Tags,
  LogOut,
  Pencil,
  Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { StoreSettingsSheet } from "@/components/StoreSettingsSheet"
import { clearAuth, getStoredUser, isStoreOwner } from "@/lib/auth"
import { getMyTenant } from "@/services/tenant"
import { showApiError } from "@/lib/utils-api"
import { cn } from "@/lib/utils"
import type { Tenant, User } from "@/types"

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL

const NAV_ITEMS = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/pedidos", label: "Pedidos", icon: ListOrdered, end: false },
  { to: "/categorias", label: "Categorias", icon: Tags, end: false },
  { to: "/produtos", label: "Produtos", icon: Package, end: false },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <item.icon className="size-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-horizontal.png"
      alt="Alô Delivery"
      className={cn("h-7 w-auto object-contain", className)}
    />
  )
}

function RoleBadge({ user }: { user: User | null }) {
  if (!user) return null
  return (
    <Badge variant={user.role === "store_owner" ? "default" : "secondary"}>
      {user.role === "store_owner" ? "Dono da loja" : "Atendente"}
    </Badge>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    getMyTenant()
      .then((response) => {
        if (active) setTenant(response.data)
      })
      .catch((error) => showApiError(error, "Erro ao carregar dados da loja"))
    return () => {
      active = false
    }
  }, [user])

  function handleLogout() {
    clearAuth()
    navigate("/login", { replace: true })
  }

  const storeUrl = tenant ? `${STOREFRONT_URL}/${tenant.slug}` : null

  function StoreActions() {
    return (
      <div className="flex flex-col gap-2">
        {tenant && isStoreOwner(user) && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3">
            <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSettingsOpen(true)}
              aria-label="Editar nome da loja"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        )}
        {storeUrl ? (
          <Button variant="outline" asChild className="justify-start gap-2">
            <a href={storeUrl} target="_blank" rel="noreferrer">
              <Store className="size-4" />
              Ver minha loja
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="justify-start gap-2" disabled>
            <Store className="size-4" />
            Ver minha loja
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-border bg-card p-4 md:flex">
          <div className="flex items-center gap-2 px-1 pt-1">
            <BrandMark />
          </div>
          <NavLinks />
          <div className="mt-auto flex flex-col gap-3">
            <StoreActions />
            {user && (
              <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                <RoleBadge user={user} />
              </div>
            )}
            <Button variant="outline" onClick={handleLogout} className="justify-start gap-2">
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <BrandMark className="h-6" />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="sr-only">Alô Delivery</SheetTitle>
                  <BrandMark />
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4 pb-4">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                  <StoreActions />
                  {user && (
                    <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <RoleBadge user={user} />
                    </div>
                  )}
                  <Button variant="outline" onClick={handleLogout} className="justify-start gap-2">
                    <LogOut className="size-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <StoreSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tenant={tenant}
        onSaved={setTenant}
      />
    </div>
  )
}
