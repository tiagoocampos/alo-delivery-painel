import { Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LoginPage } from "@/pages/login"
import { RegisterPage } from "@/pages/register"
import { DashboardPage } from "@/pages/dashboard"
import { CardapioPage } from "@/pages/cardapio"
import { PedidosPage } from "@/pages/pedidos"
import { PersonalizacaoPage } from "@/pages/personalizacao"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cardapio"
        element={
          <ProtectedRoute>
            <CardapioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <PedidosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personalizacao"
        element={
          <ProtectedRoute>
            <PersonalizacaoPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
