import { AppLayout } from "@/components/AppLayout"
import { PlanoBasicoNotice } from "@/components/PlanoBasicoNotice"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenant } from "@/contexts/TenantContext"
import { useState } from "react"
import { Mesas } from "./Mesas"
import { VendaRapida } from "./VendaRapida"
import { VendasDoDia } from "./VendasDoDia"

export function PdvPage() {
  const { tenant } = useTenant()
  const [tab, setTab] = useState("mesas")

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 pb-20 lg:pb-0">
        <div data-tour="pdv-topo">
          <h1 className="font-heading text-2xl font-semibold text-foreground">PDV</h1>
          <p className="text-sm text-muted-foreground">Controle as mesas e as vendas do balcão da sua loja.</p>
        </div>

        {!tenant ? (
          <Skeleton className="h-40 w-full" />
        ) : tenant.effectivePlan === "basico" ? (
          <PlanoBasicoNotice
            description="O PDV de balcão está disponível no plano completo."
            reassurance="Seus pedidos de delivery e o cardápio continuam funcionando normalmente no plano básico."
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="mesas">Mesas</TabsTrigger>
              <TabsTrigger value="venda-rapida">Venda rápida</TabsTrigger>
              <TabsTrigger value="vendas-hoje">Vendas de hoje</TabsTrigger>
            </TabsList>
            <TabsContent value="mesas">
              <Mesas />
            </TabsContent>
            <TabsContent value="venda-rapida">
              <VendaRapida />
            </TabsContent>
            <TabsContent value="vendas-hoje">
              <VendasDoDia onGoToMesas={() => setTab("mesas")} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  )
}
