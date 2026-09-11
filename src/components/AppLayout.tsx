import { useEffect, useState, type ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, ListOrdered, Menu, Package, Tags, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { clearAuth, getStoredUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { User } from "@/types"

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
                ? "bg-accent text-accent-foreground"
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

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  function handleLogout() {
    clearAuth()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 border-r border-border p-4 md:flex">
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">Alô Delivery</p>
            <p className="text-xs text-muted-foreground">Painel do lojista</p>
          </div>
          <NavLinks />
          <div className="mt-auto flex flex-col gap-3">
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

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <p className="font-heading text-base font-semibold text-foreground">Alô Delivery</p>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Alô Delivery</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 px-4 pb-4">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
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
    </div>
  )
}
