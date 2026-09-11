import axios from "axios"
import { toast } from "sonner"

interface FieldError {
  path: string
  message: string
}

export function getApiErrorMessage(error: unknown, fallback = "Ocorreu um erro"): string {
  if (!axios.isAxiosError(error)) return fallback
  return error.response?.data?.error || fallback
}

export function applyFieldErrors<T extends Record<string, string>>(
  error: unknown,
  fields: T,
  setErrors: (errors: T) => void
): boolean {
  if (!axios.isAxiosError(error)) return false

  const details = error.response?.data?.details as FieldError[] | undefined
  if (!details || details.length === 0) return false

  const fieldErrors = { ...fields }
  let matched = false
  details.forEach((detail) => {
    if (detail.path in fieldErrors) {
      fieldErrors[detail.path as keyof T] = detail.message as T[keyof T]
      matched = true
    }
  })

  if (!matched) return false

  setErrors(fieldErrors)
  return true
}

export function showApiError(error: unknown, fallback = "Ocorreu um erro"): void {
  toast.error(getApiErrorMessage(error, fallback), { position: "top-center" })
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function reaisToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".")
  const amount = Number(normalized)
  return Math.round(amount * 100)
}

export function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
