import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { ImageOff } from "lucide-react"
import { AppLayout } from "@/components/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyTenant, updateMyTenantProfile } from "@/services/tenant"
import { showApiError, reaisToCents, centsToReais } from "@/lib/utils-api"
import { getStoredUser, isStoreOwner } from "@/lib/auth"
import type { BusinessHourEntry, Tenant } from "@/types"

const ACCEPTED_TYPES = "image/jpeg,image/jpg,image/png"

const DAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

function defaultBusinessHours(): BusinessHourEntry[] {
  return DAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: true,
    opensAt: null,
    closesAt: null,
  }))
}

function normalizeBusinessHours(hours: BusinessHourEntry[] | null): BusinessHourEntry[] {
  if (!hours || hours.length === 0) return defaultBusinessHours()
  const byDay = new Map(hours.map((entry) => [entry.dayOfWeek, entry]))
  return DAY_LABELS.map(
    (_, dayOfWeek) => byDay.get(dayOfWeek) ?? { dayOfWeek, isClosed: true, opensAt: null, closesAt: null }
  )
}

function normalizeInstagramUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const username = trimmed.replace(/^@/, "")
  return `https://instagram.com/${username}`
}

const storeInfoSchema = z.object({
  description: z.string().optional(),
  address: z.string().optional(),
  instagramUrl: z.string().optional(),
  minimumOrderValue: z
    .string()
    .optional()
    .refine((value) => !value || /^\d+([.,]\d{1,2})?$/.test(value), "Valor inválido (ex: 30,00)"),
})

type StoreInfoValues = z.infer<typeof storeInfoSchema>

interface ImageFieldProps {
  title: string
  helpText: string
  currentUrl: string | null
  file: File | null
  previewUrl: string | null
  onFileChange: (file: File | null) => void
  previewClassName: string
}

function ImageField({ title, helpText, currentUrl, file, previewUrl, onFileChange, previewClassName }: ImageFieldProps) {
  const displayUrl = previewUrl ?? currentUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {displayUrl ? (
          <img src={displayUrl} alt={title} className={previewClassName} />
        ) : (
          <div className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted text-muted-foreground ${previewClassName}`}>
            <ImageOff className="size-6" />
            <span className="text-xs">Nenhuma imagem cadastrada ainda</span>
          </div>
        )}

        <Input
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />

        <p className="text-xs text-muted-foreground">{helpText}</p>
        {file && <p className="text-xs text-foreground">Nova imagem selecionada: {file.name}</p>}
      </CardContent>
    </Card>
  )
}

interface BusinessHourRowProps {
  label: string
  entry: BusinessHourEntry
  onChange: (patch: Partial<BusinessHourEntry>) => void
}

function BusinessHourRow({ label, entry, onChange }: BusinessHourRowProps) {
  const isOpen = !entry.isClosed

  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Switch
          checked={isOpen}
          onCheckedChange={(checked) =>
            onChange(
              checked
                ? { isClosed: false, opensAt: entry.opensAt ?? "08:00", closesAt: entry.closesAt ?? "18:00" }
                : { isClosed: true }
            )
          }
        />
        <span className="w-32 text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{isOpen ? "Aberto" : "Fechado"}</span>
      </div>

      {isOpen && (
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={entry.opensAt ?? ""}
            onChange={(e) => onChange({ opensAt: e.target.value })}
            className="w-32"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="time"
            value={entry.closesAt ?? ""}
            onChange={(e) => onChange({ closesAt: e.target.value })}
            className="w-32"
          />
        </div>
      )}
    </div>
  )
}

export function PersonalizacaoPage() {
  const owner = isStoreOwner(getStoredUser())
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [logo, setLogo] = useState<File | null>(null)
  const [banner, setBanner] = useState<File | null>(null)
  const [favicon, setFavicon] = useState<File | null>(null)

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)

  const [businessHours, setBusinessHours] = useState<BusinessHourEntry[]>(defaultBusinessHours())

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StoreInfoValues>({ resolver: zodResolver(storeInfoSchema) })

  async function loadTenant() {
    try {
      setLoading(true)
      const response = await getMyTenant()
      setTenant(response.data)
      reset({
        description: response.data.description ?? "",
        address: response.data.address ?? "",
        instagramUrl: response.data.instagramUrl ?? "",
        minimumOrderValue: centsToReais(response.data.minimumOrderValue),
      })
      setBusinessHours(normalizeBusinessHours(response.data.businessHours))
    } catch (error) {
      showApiError(error, "Erro ao carregar dados da loja")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenant()
  }, [])

  useEffect(() => {
    if (!logo) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logo)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logo])

  useEffect(() => {
    if (!banner) {
      setBannerPreview(null)
      return
    }
    const url = URL.createObjectURL(banner)
    setBannerPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [banner])

  useEffect(() => {
    if (!favicon) {
      setFaviconPreview(null)
      return
    }
    const url = URL.createObjectURL(favicon)
    setFaviconPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [favicon])

  function updateBusinessHourDay(dayOfWeek: number, patch: Partial<BusinessHourEntry>) {
    setBusinessHours((current) =>
      current.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, ...patch } : entry))
    )
  }

  async function onSubmit(values: StoreInfoValues) {
    try {
      setSubmitting(true)
      // O backend valida instagramUrl com .url() — string vazia não é uma URL
      // válida nem é tratada como "ausente", então só enviamos o campo quando
      // há de fato um valor (senão a validação falhava em toda loja sem
      // Instagram cadastrado, que é a maioria).
      const normalizedInstagram = normalizeInstagramUrl(values.instagramUrl ?? "")
      const response = await updateMyTenantProfile({
        logo,
        banner,
        favicon,
        description: values.description ?? "",
        address: values.address ?? "",
        instagramUrl: normalizedInstagram || undefined,
        minimumOrderValue: reaisToCents(values.minimumOrderValue || "0"),
        businessHours: businessHours.map((entry) =>
          entry.isClosed
            ? { ...entry, opensAt: null, closesAt: null }
            : { ...entry, opensAt: entry.opensAt || "08:00", closesAt: entry.closesAt || "18:00" }
        ),
      })
      setTenant(response.data)
      setLogo(null)
      setBanner(null)
      setFavicon(null)
      toast.success("Configurações da loja atualizadas!", { position: "top-center" })
    } catch (error) {
      showApiError(error, "Erro ao atualizar as configurações da loja")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Personalização</h1>
          <p className="text-sm text-muted-foreground">
            Personalize a aparência e as informações do seu cardápio online.
          </p>
        </div>

        {!owner ? (
          <p className="text-sm text-muted-foreground">
            Somente o dono da loja pode alterar as configurações da loja.
          </p>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ImageField
                title="Logo"
                helpText="Aparece no cabeçalho do seu cardápio. Prefira uma imagem quadrada."
                currentUrl={tenant?.logoUrl ?? null}
                file={logo}
                previewUrl={logoPreview}
                onFileChange={setLogo}
                previewClassName="h-32 w-32 self-center rounded-lg object-cover"
              />

              <ImageField
                title="Banner"
                helpText="Aparece no topo do seu cardápio, atrás do nome da loja. Prefira uma imagem larga (formato paisagem)."
                currentUrl={tenant?.bannerUrl ?? null}
                file={banner}
                previewUrl={bannerPreview}
                onFileChange={setBanner}
                previewClassName="h-32 w-full rounded-lg object-cover"
              />

              <ImageField
                title="Favicon"
                helpText="O ícone que aparece na aba do navegador. Prefira uma imagem quadrada simples, sem muito detalhe."
                currentUrl={tenant?.faviconUrl ?? null}
                file={favicon}
                previewUrl={faviconPreview}
                onFileChange={setFavicon}
                previewClassName="h-16 w-16 self-center rounded-lg object-cover"
              />
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações da loja</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Descrição da loja</Label>
                  <Textarea
                    id="description"
                    placeholder="Conte um pouco sobre sua loja"
                    {...register("description")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" placeholder="Rua, número, bairro, cidade" {...register("address")} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="instagramUrl">Instagram</Label>
                    <Input id="instagramUrl" placeholder="@sualoja" {...register("instagramUrl")} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="minimumOrderValue">Pedido mínimo (R$)</Label>
                    <Input id="minimumOrderValue" placeholder="Ex: 30,00" {...register("minimumOrderValue")} />
                    {errors.minimumOrderValue && (
                      <span className="text-xs text-destructive">{errors.minimumOrderValue.message}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Horário de funcionamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {businessHours.map((entry) => (
                  <BusinessHourRow
                    key={entry.dayOfWeek}
                    label={DAY_LABELS[entry.dayOfWeek]}
                    entry={entry}
                    onChange={(patch) => updateBusinessHourDay(entry.dayOfWeek, patch)}
                  />
                ))}
              </CardContent>
            </Card>

            <div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
