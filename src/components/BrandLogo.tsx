import { cn } from "@/lib/utils"

// Logo "Alô Delivery": a versão azul some no fundo escuro,
// então no modo escuro mostramos a versão branca oficial.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      <img src="/brand/logo-horizontal.png" alt="Alô Delivery" className={cn("w-auto object-contain dark:hidden", className)} />
      <img
        src="/brand/logo-horizontal-white.png"
        alt="Alô Delivery"
        className={cn("hidden w-auto object-contain dark:block", className)}
      />
    </>
  )
}
