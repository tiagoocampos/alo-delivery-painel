import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// Tema do painel: claro, escuro ou automático (segue o sistema do computador).
// A escolha fica só neste aparelho. O script no index.html aplica o tema antes
// do app carregar, para a tela não piscar branco: as chaves e cores precisam
// ser as mesmas dos dois lados.

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "painel-tema"
// Cor da barra do navegador/PWA em cada tema.
const THEME_COLORS = { light: "#1769e0", dark: "#0c1422" }

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === "light" || saved === "dark" ? saved : "system"
  } catch {
    return "system"
  }
}

const darkQuery = "(prefers-color-scheme: dark)"

interface ThemeContextValue {
  theme: Theme
  // O tema que está valendo de fato (o "system" vira claro ou escuro).
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(darkQuery).matches)

  // No automático, acompanha a troca de tema do sistema com o painel aberto.
  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme

  // Aplica a classe "dark" no <html> e a cor da barra do navegador.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[resolvedTheme])
  }, [resolvedTheme])

  function setTheme(next: Theme) {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage bloqueado: a escolha vale só até recarregar.
    }
  }

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
