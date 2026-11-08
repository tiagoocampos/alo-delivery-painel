import { ORDER_STATUS_LABELS } from "@/lib/orderStatus"

// Todo o texto do tutorial fica aqui. Cada alvo é marcado no código com
// data-tour="nome" (ver os componentes e páginas).

export interface TourContext {
  isOwner: boolean
  plan: "completo" | "basico"
  isMobile: boolean
}

export interface TourStepDef {
  id: string
  title: string
  text: string
  // Textos alternativos conforme quem está vendo.
  textStaff?: string
  textBasico?: string
  textMobile?: string
  // Rota onde o passo acontece. O tour navega até ela sozinho.
  route?: string
  // Alvo (desktop). Sem alvo, ou alvo ausente/invisível, o balão aparece centralizado.
  selector?: string
  // Alvo no celular. null = centralizado. Omitido = usa `selector`.
  // No celular o menu lateral fica num Sheet e o tour nunca o abre.
  mobileSelector?: string | null
  // Quem vê o passo.
  ownerOnly?: boolean
  // Passo que depende do plano completo.
  requiresFullPlan?: boolean
  // Só entra no tour se o alvo existir e estiver visível quando o tour começa
  // (ex.: o botão de instalar o app só existe em navegadores que permitem).
  requireElement?: boolean
  desktopOnly?: boolean
  // Blocos extras dentro do balão.
  extras?: "store-link"
  illustration?: "cliente-pede"
  // Texto do último botão.
  finishLabel?: string
}

const stageFlow = ["novo", "preparo", "transporte", "entregue"] as const
const STAGES = stageFlow.map((status) => ORDER_STATUS_LABELS[status]).join(" → ")

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: "boas-vindas",
    title: "Bem-vindo ao Alô Delivery!",
    text: "Em poucos passos você vai ver como montar o cardápio, receber pedidos e divulgar sua loja.",
  },
  {
    id: "painel",
    route: "/",
    selector: '[data-tour="dashboard-resumo"]',
    title: "Seu painel",
    text: "Aqui você acompanha o dia: pedidos novos, pedidos em andamento, quanto já vendeu hoje e os produtos mais pedidos.",
  },
  {
    id: "cardapio",
    route: "/cardapio",
    selector: '[data-tour="cardapio-acoes"]',
    title: "Comece pelo cardápio",
    text: "Crie as categorias (ex.: Lanches, Bebidas) e depois os produtos de cada uma.",
    textStaff: "Aqui você consulta as categorias e os produtos da loja. Quem cria e edita o cardápio é o dono da loja.",
  },
  {
    id: "produto",
    route: "/cardapio",
    selector: '[data-tour="cardapio-lista"]',
    title: "Cadastre cada produto",
    text: "No produto você coloca nome, preço, descrição e foto (enviando o arquivo ou colando um link; a foto é opcional). Cadastre os ingredientes e os adicionais com preço: o cliente poderá tirar ingredientes e incluir extras. Itens só do balcão (como cerveja ou cigarro) podem ficar fora do cardápio online escolhendo \"Só balcão\" em \"Onde vender\".",
    textStaff: "Cada produto tem nome, preço, descrição, foto, ingredientes e adicionais. Para mudar algo, peça ao dono da loja.",
  },
  {
    id: "pedidos",
    route: "/pedidos",
    selector: '[data-tour="pedidos-topo"]',
    title: "Receba os pedidos",
    text: `Os pedidos chegam aqui e você avança cada um pelas etapas: ${STAGES}. Dá para cancelar enquanto o pedido não foi entregue.`,
  },
  {
    id: "personalizacao",
    route: "/personalizacao",
    selector: '[data-tour="personalizacao-topo"]',
    title: "Deixe a loja com a sua cara",
    text: "Aqui ficam o logo, o banner e o ícone da loja, além de descrição, endereço, chave Pix, Instagram, pedido mínimo e horário de funcionamento. No plano completo, as cores do site da loja se adaptam ao seu logo.",
    textBasico:
      "Aqui ficam a descrição, o endereço, a chave Pix, o Instagram, o pedido mínimo e o horário de funcionamento da loja. Logo, banner e as cores do site personalizadas são do plano completo.",
    ownerOnly: true,
  },
  {
    id: "dados-loja",
    selector: '[data-tour="loja-editar"]',
    mobileSelector: '[data-tour="menu-button"]',
    title: "Nome da loja",
    text: "O lápis ao lado do nome da loja altera o nome que seus clientes veem. Mantenha também em dia o endereço, o horário e o pedido mínimo, em Personalização.",
    textMobile:
      "Abra o menu (☰) e use o lápis ao lado do nome da loja para alterar o nome que seus clientes veem. Mantenha também em dia o endereço, o horário e o pedido mínimo, em Personalização.",
    ownerOnly: true,
  },
  {
    id: "ver-loja",
    selector: '[data-tour="ver-loja"]',
    mobileSelector: '[data-tour="menu-button"]',
    title: "Sua loja online",
    text: "Este é o endereço da sua loja online: é o que seus clientes usam para pedir. Divulgue no WhatsApp e no Instagram.",
    textMobile:
      "No menu (☰), o botão \"Ver minha loja\" abre a sua loja online: é o que seus clientes usam para pedir. Divulgue o link no WhatsApp e no Instagram.",
    extras: "store-link",
  },
  {
    id: "cliente-pede",
    title: "Como o cliente pede",
    text: "Veja como é para o seu cliente. O cliente também pode instalar a sua loja no celular como um app.",
    illustration: "cliente-pede",
  },
  {
    id: "instalar-app",
    selector: '[data-tour="instalar-app"]',
    title: "Instale o painel como app",
    text: "Instale o painel no seu computador para abrir com um clique, sem procurar o endereço.",
    requireElement: true,
    desktopOnly: true,
  },
  {
    id: "pdv",
    route: "/pdv",
    selector: '[data-tour="pdv-topo"]',
    title: "PDV: o balcão da loja",
    text: "No PDV você controla as mesas da loja física: abre a mesa, lança os itens e fecha a conta com a forma de pagamento. Também faz vendas rápidas, sem mesa.",
    requiresFullPlan: true,
  },
  {
    id: "final",
    title: "Pronto!",
    text: "Agora é só cadastrar seus produtos e divulgar o link da sua loja. Se precisar rever algo, abra \"Tutorial\" no menu.",
    finishLabel: "Concluir",
  },
]

export interface ResolvedStep extends TourStepDef {
  // Texto final, já escolhido por papel, plano e tamanho de tela.
  body: string
}

export function pickText(step: TourStepDef, { isOwner, plan, isMobile }: TourContext): string {
  if (!isOwner && step.textStaff) return step.textStaff
  if (plan === "basico" && step.textBasico) return step.textBasico
  if (isMobile && step.textMobile) return step.textMobile
  return step.text
}

export function resolveSelector(step: TourStepDef, isMobile: boolean): string | null {
  if (isMobile) {
    if (step.mobileSelector === null) return null
    if (step.mobileSelector !== undefined) return step.mobileSelector
  }
  return step.selector ?? null
}

function isVisible(element: Element | null) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Filtra por papel, plano e disponibilidade real. O contador "Passo X de N"
// usa o total já filtrado.
export function buildSteps(context: TourContext, root: ParentNode = document): ResolvedStep[] {
  return TOUR_STEPS.filter((step) => {
    if (step.ownerOnly && !context.isOwner) return false
    if (step.requiresFullPlan && context.plan === "basico") return false
    if (step.desktopOnly && context.isMobile) return false
    if (step.requireElement && step.selector && !isVisible(root.querySelector(step.selector))) return false
    return true
  }).map((step) => ({ ...step, body: pickText(step, context) }))
}
