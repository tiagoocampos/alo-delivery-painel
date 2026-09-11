import type { User } from "@/types"

export function getToken(): string | null {
  return localStorage.getItem("token")
}

export function getStoredUser(): User | null {
  const stored = localStorage.getItem("user")
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}

export function getAuthHeaders(): { Authorization: string } | null {
  const token = getToken()
  if (!token) return null
  return { Authorization: `Bearer ${token}` }
}

export function clearAuth(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export function isStoreOwner(user: User | null): boolean {
  return user?.role === "store_owner"
}
