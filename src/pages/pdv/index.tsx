import { AppLayout } from "@/components/AppLayout"
import { PlanoBasicoNotice } from "@/components/PlanoBasicoNotice"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenant } from "@/contexts/TenantContext"
import { NovaVenda } from "./NovaVenda"
import { VendasDoDia } from "./VendasDoDia"

export function PdvPage() {
  const { tenant } = useTenant()

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 pb-20 lg:pb-0">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">PDV</h1>
          <p className="text-sm text-muted-foreground">Registre as vendas do balcão da sua loja.</p>
        </div>

        {!tenant ? (
          <Skeleton className="h-40 w-full" />
        ) : tenant.effectivePlan === "basico" ? (
          <PlanoBasicoNotice
            description="O PDV de balcão está disponível no plano completo."
            reassurance="Seus pedidos de delivery e o cardápio continuam funcionando normalmente no plano básico."
          />
        ) : (
          <Tabs defaultValue="nova-venda">
            <TabsList>
              <TabsTrigger value="nova-venda">Nova venda</TabsTrigger>
              <TabsTrigger value="vendas-hoje">Vendas de hoje</TabsTrigger>
            </TabsList>
            <TabsContent value="nova-venda">
              <NovaVenda />
            </TabsContent>
            <TabsContent value="vendas-hoje">
              <VendasDoDia />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  )
}
