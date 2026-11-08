import { Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LoginPage } from "@/pages/login"
import { RegisterPage } from "@/pages/register"
import { EsqueciSenhaPage } from "@/pages/esqueci-senha"
import { RedefinirSenhaPage } from "@/pages/redefinir-senha"
import { DashboardPage } from "@/pages/dashboard"
import { CardapioPage } from "@/pages/cardapio"
import { PedidosPage } from "@/pages/pedidos"
import { PersonalizacaoPage } from "@/pages/personalizacao"
import { PdvPage } from "@/pages/pdv"
import { MesaPage } from "@/pages/pdv/MesaPage"
import { TourProvider } from "@/tour/TourProvider"
import { TourInvite } from "@/tour/TourInvite"
import { TourOverlay } from "@/tour/TourOverlay"

function App() {
  return (
    // O tutorial vive acima das rotas: cada página monta o próprio AppLayout, que
    // remonta a cada troca de rota e perderia o passo atual do tour.
    <TourProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
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
        path="/pdv"
        element={
          <ProtectedRoute>
            <PdvPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pdv/mesa/:id"
        element={
          <ProtectedRoute>
            <MesaPage />
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
    <TourInvite />
    <TourOverlay />
    </TourProvider>
  )
}

export default App
