import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { getToken } from "@/lib/auth"

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate("/login", { replace: true })
      return
    }
    setIsAuthenticated(true)
  }, [navigate])

  if (isAuthenticated === null) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />
  }

  return <>{children}</>
}
