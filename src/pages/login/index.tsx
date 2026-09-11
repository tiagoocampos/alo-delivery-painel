import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { setAuth } from "@/lib/auth"
import { applyFieldErrors, getApiErrorMessage } from "@/lib/utils-api"
import type { User } from "@/types"

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginValues) {
    try {
      setLoading(true)
      const response = await api.post("/login", values)
      const { token, ...user } = response.data as User & { token: string }
      setAuth(token, user)
      toast.success("Login realizado com sucesso!", { position: "top-center" })
      navigate("/", { replace: true })
    } catch (error) {
      const applied = applyFieldErrors(
        error,
        { email: "", password: "" },
        (fieldErrors) => {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            if (message) setError(field as keyof LoginValues, { message })
          })
        }
      )
      if (!applied) {
        toast.error(getApiErrorMessage(error, "Não foi possível entrar"), { position: "top-center" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <p className="font-heading text-xl font-semibold text-foreground">Alô Delivery</p>
          <p className="text-sm text-muted-foreground">Entre para gerenciar sua loja</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="voce@loja.com" {...register("email")} />
            {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="Sua senha" {...register("password")} />
            {errors.password && <span className="text-xs text-destructive">{errors.password.message}</span>}
          </div>

          <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem uma loja?{" "}
          <a href="https://alo-delivery-website.vercel.app/#contato" target="_blank" className="font-medium text-foreground underline underline-offset-4">
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  )
}
