import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme, type Theme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
]

// Seletor de tema: três botões lado a lado (Claro, Escuro, Automático).
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div role="group" aria-label="Tema do painel" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-background text-foreground shadow-sm dark:bg-card" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
