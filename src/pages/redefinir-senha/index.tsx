import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
    confirmNewPassword: z.string().min(1, "Confirme sua nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas devem ser iguais",
    path: ["confirmNewPassword"],
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [loading, setLoading] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  useEffect(() => {
    setInvalidToken(false)
  }, [token])

  if (!token) {
    return <Navigate to="/esqueci-senha" replace />
  }

  async function onSubmit(values: ResetPasswordValues) {
    try {
      setLoading(true)
      await api.post("/auth/reset-password", { token, newPassword: values.newPassword })
      toast.success("Senha redefinida com sucesso! Faça login com a nova senha.", { position: "top-center" })
      navigate("/login", { replace: true })
    } catch {
      setInvalidToken(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-white to-muted px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -right-40 size-105 rounded-full bg-accent/70 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_20px_50px_-20px_rgba(23,105,224,0.25)] ring-1 ring-border sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/brand/logo-horizontal.png" alt="Alô Delivery" className="h-9 w-auto object-contain" />
          <p className="text-sm text-muted-foreground">Defina uma nova senha</p>
        </div>

        {invalidToken ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-foreground">
              Esse link de redefinição é inválido ou já expirou. Solicite um novo link para continuar.
            </p>
            <Link to="/esqueci-senha" className="text-sm font-medium text-foreground underline underline-offset-4">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 8 caracteres"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <span className="text-xs text-destructive">{errors.newPassword.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                placeholder="Repita a nova senha"
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && (
                <span className="text-xs text-destructive">{errors.confirmNewPassword.message}</span>
              )}
            </div>

            <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
