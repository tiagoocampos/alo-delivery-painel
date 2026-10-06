import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TenantProvider } from "@/contexts/TenantContext"
import { InstallPromptProvider } from "@/contexts/InstallPromptContext"
import "./index.css"
import App from "./App.tsx"

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <InstallPromptProvider>
        <TenantProvider>
          <App />
          <Toaster position="top-center" />
        </TenantProvider>
      </InstallPromptProvider>
    </BrowserRouter>
  </StrictMode>
)
