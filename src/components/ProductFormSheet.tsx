import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductVariants } from "@/components/ProductVariants"
import { ProductExtras } from "@/components/ProductExtras"
import { IngredientsField } from "@/components/IngredientsField"
import { api } from "@/services/api"
import { showApiError, centsToReais, reaisToCents } from "@/lib/utils-api"
import type { Category, Product, ProductAvailability, ProductBadge } from "@/types"

const NO_BADGE = "none"

const BADGE_OPTIONS: { value: ProductBadge | typeof NO_BADGE; label: string }[] = [
  { value: NO_BADGE, label: "Nenhum" },
  { value: "mais_pedido", label: "Mais pedido" },
  { value: "promocao", label: "Promoção" },
  { value: "novo", label: "Novo" },
]

const AVAILABILITY_OPTIONS: { value: ProductAvailability; label: string }[] = [
  { value: "ambos", label: "Delivery e balcão" },
  { value: "delivery", label: "Só delivery" },
  { value: "balcao", label: "Só balcão" },
]

const productSchema = z.object({
  name: z.string().min(1, "O nome do produto é obrigatório"),
  description: z.string().optional(),
  basePrice: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Preço inválido (ex: 25,90)")
    .optional()
    .or(z.literal("")),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  badge: z.string(),
  availability: z.enum(["ambos", "delivery", "balcao"]),
})

type ProductValues = z.infer<typeof productSchema>

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  product: Product | null
  defaultCategoryId?: string
  onSaved: () => void
  onCreated: (product: Product) => void
}

export function ProductFormSheet({
  open,
  onOpenChange,
  categories,
  product,
  defaultCategoryId,
  onSaved,
  onCreated,
}: ProductFormSheetProps) {
  const isEdit = Boolean(product)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [removeImage, setRemoveImage] = useState(false)
  const [ingredients, setIngredients] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<ProductValues>({ resolver: zodResolver(productSchema) })

  useEffect(() => {
    if (!open) return
    setFile(null)
    setImageUrl("")
    setRemoveImage(false)
    setFileError("")
    setIngredients(product?.ingredients ?? [])
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? "",
        basePrice: product.basePrice === null ? "" : centsToReais(product.basePrice),
        categoryId: product.categoryId,
        badge: product.badge ?? NO_BADGE,
        availability: product.availability ?? "ambos",
      })
    } else {
      reset({ name: "", description: "", basePrice: "", categoryId: defaultCategoryId ?? "", badge: NO_BADGE, availability: "ambos" })
    }
  }, [open, product, defaultCategoryId, reset])

  // Categorias com tamanhos cadastrados tratam seus produtos como "sabores":
  // o preço vem do tamanho escolhido pelo cliente, não do produto em si.
  const selectedCategory = categories.find((category) => category.id === watch("categoryId"))
  const categoryHasSizes = Boolean(selectedCategory?.sizes?.length)

  async function imageFromUrl(url: string): Promise<File | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("bad status")
      const blob = await response.blob()
      if (!["image/jpeg", "image/jpg", "image/png"].includes(blob.type)) {
        setFileError("O link precisa ser de uma imagem JPG ou PNG")
        return null
      }
      const extension = blob.type === "image/png" ? "png" : "jpg"
      return new File([blob], `imagem.${extension}`, { type: blob.type })
    } catch {
      setFileError("Não foi possível baixar a imagem desse link. Baixe-a e envie como arquivo.")
      return null
    }
  }

  async function onSubmit(values: ProductValues) {
    const trimmedUrl = imageUrl.trim()
    let imageFile = file
    if (!imageFile && trimmedUrl) {
      setSubmitting(true)
      imageFile = await imageFromUrl(trimmedUrl)
      setSubmitting(false)
      if (!imageFile) return
    }

    if (!categoryHasSizes && !values.basePrice) {
      setError("basePrice", { type: "manual", message: "Informe o preço" })
      return
    }

    const formData = new FormData()
    formData.append("name", values.name)
    if (values.description) formData.append("description", values.description)
    if (!categoryHasSizes && values.basePrice) {
      formData.append("basePrice", String(reaisToCents(values.basePrice)))
    }
    formData.append("categoryId", values.categoryId)
    formData.append("availability", values.availability)
    // Ingredientes vão como texto JSON. Na criação sempre; na edição só se a
    // lista mudou (enviar "[]" limpa no backend, então não mandamos à toa).
    const ingredientsChanged = JSON.stringify(ingredients) !== JSON.stringify(product?.ingredients ?? [])
    if (!isEdit || ingredientsChanged) {
      formData.append("ingredients", JSON.stringify(ingredients))
    }
    // O backend valida "badge" como um dos 3 valores, null (de verdade) ou
    // ausente — nunca string vazia. Como multipart/form-data só transmite
    // strings, não dá pra representar "null" nesse formato; por isso, quando
    // não há selo, omitimos o campo (backend simplesmente não altera o valor
    // atual) em vez de mandar "", que a validação rejeitava sempre.
    if (values.badge !== NO_BADGE) {
      formData.append("badge", values.badge)
    }
    if (imageFile) {
      formData.append("file", imageFile)
    } else if (isEdit && removeImage) {
      // Sem imagem nova, "Remover imagem" apaga a que já estava salva.
      formData.append("removeImage", "true")
    }

    try {
      setSubmitting(true)
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, formData)
        toast.success("Produto atualizado!", { position: "top-center" })
        onSaved()
        onOpenChange(false)
      } else {
        const response = await api.post<Product>("/products", formData)
        toast.success("Produto criado! Agora você pode configurar variações, se precisar.", {
          position: "top-center",
        })
        // Mantém o sheet aberto e muda para modo edição: variações só podem
        // ser criadas depois que o produto existe (precisam do id).
        // A resposta do POST não traz variações/adicionais (o produto acabou de
        // nascer); sem esses vazios o formulário em modo edição quebraria.
        onCreated({
          ...response.data,
          variants: response.data.variants ?? [],
          extras: response.data.extras ?? [],
          ingredients: response.data.ingredients ?? [],
        })
        onSaved()
      }
    } catch (error) {
      showApiError(error, isEdit ? "Erro ao atualizar produto" : "Erro ao criar produto")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar produto" : "Novo produto"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Atualize as informações do produto." : "Preencha os dados do novo produto."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: X-Salada" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" placeholder="Ingredientes, tamanho..." {...register("description")} />
          </div>

          <IngredientsField
            value={ingredients}
            onChange={setIngredients}
            description={watch("description") ?? ""}
          />

          <div className="flex flex-col gap-1.5">
            <Label>Categoria</Label>
            <Select value={watch("categoryId") || undefined} onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <span className="text-xs text-destructive">{errors.categoryId.message}</span>}
          </div>

          {categoryHasSizes ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              Esta categoria usa tamanhos com preço próprio — cadastre aqui só o sabor, o preço é definido no
              tamanho da categoria.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="basePrice">Preço (R$)</Label>
              <Input id="basePrice" placeholder="Ex: 25,90" {...register("basePrice")} />
              {errors.basePrice && <span className="text-xs text-destructive">{errors.basePrice.message}</span>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Onde vender</Label>
            <Select
              value={watch("availability")}
              onValueChange={(value) => {
                setValue("availability", value as ProductAvailability, { shouldValidate: true })
                setFileError("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Onde vender" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Selo</Label>
            <Select value={watch("badge") || undefined} onValueChange={(value) => setValue("badge", value, { shouldValidate: true })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um selo" />
              </SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Imagem (opcional)</Label>
            <Input
              id="file"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setImageUrl("")
                setRemoveImage(false)
                setFileError("")
              }}
            />
            <Input
              type="url"
              value={imageUrl}
              disabled={Boolean(file)}
              placeholder="Ou cole o link de uma imagem (https://...)"
              onChange={(e) => {
                setImageUrl(e.target.value)
                setRemoveImage(false)
                setFileError("")
              }}
            />
            {isEdit && product?.imageUrl && !file && !imageUrl.trim() && (
              <div className="mt-1 flex items-center gap-3">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={`h-24 w-24 rounded-lg object-cover ${removeImage ? "opacity-30 grayscale" : ""}`}
                />
                <div className="flex flex-col items-start gap-1.5">
                  {removeImage ? (
                    <>
                      <span className="text-xs text-muted-foreground">A imagem será removida ao salvar.</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setRemoveImage(false)}>
                        Desfazer
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setRemoveImage(true)}>
                      <Trash2 className="size-3.5" />
                      Remover imagem
                    </Button>
                  )}
                </div>
              </div>
            )}
            {fileError && <span className="text-xs text-destructive">{fileError}</span>}
          </div>

          {isEdit && product && !categoryHasSizes && (
            <div className="border-t border-border pt-4">
              <ProductVariants
                productId={product.id}
                variants={product.variants}
                canManage
                onChanged={onSaved}
              />
            </div>
          )}

          {isEdit && product && !categoryHasSizes && (
            <div className="border-t border-border pt-4">
              <ProductExtras
                productId={product.id}
                extras={product.extras}
                canManage
                onChanged={onSaved}
              />
            </div>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
