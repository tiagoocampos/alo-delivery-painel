import { useState } from "react"
import { Link } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

const GENERIC_MESSAGE =
  "Se esse e-mail estiver cadastrado, você vai receber um link em instantes. Confira também a caixa de spam."

export function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(values: ForgotPasswordValues) {
    setLoading(true)
    try {
      await api.post("/auth/forgot-password", values)
    } catch {
      // O feedback é sempre o mesmo, independente do resultado, para não revelar se o e-mail existe.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-white to-muted px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -right-40 size-105 rounded-full bg-accent/70 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_20px_50px_-20px_rgba(23,105,224,0.25)] ring-1 ring-border sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/brand/logo-horizontal.png" alt="Alô Delivery" className="h-9 w-auto object-contain" />
          <p className="text-sm text-muted-foreground">Recupere o acesso à sua loja</p>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-foreground">{GENERIC_MESSAGE}</p>
            <Link to="/login" className="text-sm font-medium text-foreground underline underline-offset-4">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@loja.com" {...register("email")} />
              {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
            </div>

            <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
