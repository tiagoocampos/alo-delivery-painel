import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface InstallPromptContextValue {
  canInstall: boolean
  isIos: boolean
  isStandalone: boolean
  promptInstall: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null)

function getIsStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  // iOS Safari expõe isso em vez do display-mode media query.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function getIsIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(getIsStandalone())

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const value: InstallPromptContextValue = {
    canInstall: Boolean(deferredPrompt),
    isIos: getIsIos(),
    isStandalone,
    promptInstall,
  }

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
}

export function useInstallPrompt(): InstallPromptContextValue {
  const context = useContext(InstallPromptContext)
  if (!context) throw new Error("useInstallPrompt must be used within an InstallPromptProvider")
  return context
}
