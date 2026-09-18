import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { TenantProvider } from "@/contexts/TenantContext"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TenantProvider>
        <App />
        <Toaster position="top-center" />
      </TenantProvider>
    </BrowserRouter>
  </StrictMode>
)
