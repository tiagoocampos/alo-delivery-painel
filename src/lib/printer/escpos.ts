// Monta a comanda em bytes ESC/POS para a impressora térmica.
// A lógica de codificar() e montar() veio do arquivo teste-impressora.html,
// que já foi testado na impressora real.
// Comandos: https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/

import { formatDate, formatPrice } from "@/lib/utils-api"
import type { Order, OrderItem } from "@/types"
import type { CodePage, PrinterSettings } from "./settings"

// Letras com acento que existem na tabela OEM860 (português).
const CP860: Record<string, number> = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ã": 0x84, "à": 0x85, "Á": 0x86, "ç": 0x87, "ê": 0x88, "Ê": 0x89,
  "è": 0x8a, "Í": 0x8b, "Ô": 0x8c, "ì": 0x8d, "Ã": 0x8e, "Â": 0x8f, "É": 0x90, "À": 0x91, "È": 0x92, "ô": 0x93,
  "õ": 0x94, "ò": 0x95, "Ú": 0x96, "ù": 0x97, "Ì": 0x98, "Õ": 0x99, "Ü": 0x9a, "Ó": 0x9f, "á": 0xa0, "í": 0xa1,
  "ó": 0xa2, "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5, "ª": 0xa6, "º": 0xa7,
}

const PAGAMENTO: Record<string, string> = {
  pix_manual: "Pix",
  na_entrega: "Na entrega",
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
}

// Uma linha da comanda, com o estilo dela.
interface Linha {
  texto: string
  centro?: boolean
  negrito?: boolean
  grande?: boolean
  recuo?: number // espaços à esquerda (usado nos detalhes do item)
}

// Troca caracteres que a impressora não tem por equivalentes simples.
// O espaço "inquebrável" vem do formatPrice ("R$ 10,00").
function simplificar(texto: string): string {
  return texto
    .replace(/ /g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
}

// Converte texto em bytes conforme a tabela de caracteres escolhida.
// Caractere sem equivalente (ex: emoji) vira "?".
export function codificar(texto: string, tabela: CodePage): number[] {
  const bytes: number[] = []
  for (const ch of simplificar(texto)) {
    const codigo = ch.codePointAt(0) ?? 63
    if (codigo < 128) bytes.push(codigo)
    else if (tabela === 55 && CP860[ch] !== undefined) bytes.push(CP860[ch])
    else if (tabela === 71 && codigo < 256) bytes.push(codigo)
    else bytes.push(63) // "?"
  }
  return bytes
}

// Quebra o texto no limite de colunas sem cortar palavra no meio.
// Só corta uma palavra se ela sozinha for maior que a linha.
export function quebrarTexto(texto: string, largura: number): string[] {
  const linhas: string[] = []

  for (const paragrafo of simplificar(texto).split(/\r?\n/)) {
    const inicio = linhas.length
    let atual = ""

    for (let palavra of paragrafo.split(" ").filter(Boolean)) {
      while (palavra.length > largura) {
        if (atual) linhas.push(atual)
        atual = ""
        linhas.push(palavra.slice(0, largura))
        palavra = palavra.slice(largura)
      }
      if (!palavra) continue

      if (!atual) atual = palavra
      else if (atual.length + 1 + palavra.length <= largura) atual += " " + palavra
      else {
        linhas.push(atual)
        atual = palavra
      }
    }

    if (atual || linhas.length === inicio) linhas.push(atual)
  }

  return linhas
}

// Junta comandos ESC/POS + texto em bytes prontos para enviar.
function montar(linhas: Linha[], config: PrinterSettings): Uint8Array {
  const b: number[] = []
  b.push(0x1b, 0x40) // ESC @: iniciar impressora
  b.push(0x1b, 0x74, config.codePage) // ESC t n: tabela de caracteres

  for (const linha of linhas) {
    // Letra grande ocupa o dobro da largura: cabem metade das colunas.
    const colunas = linha.grande ? config.columns / 2 : config.columns
    const recuo = " ".repeat(linha.recuo ?? 0)

    b.push(0x1b, 0x61, linha.centro ? 1 : 0) // ESC a n: alinhamento
    b.push(0x1b, 0x45, linha.negrito ? 1 : 0) // ESC E n: negrito
    b.push(0x1d, 0x21, linha.grande ? 0x11 : 0x00) // GS ! n: tamanho

    for (const pedaco of quebrarTexto(linha.texto, colunas - recuo.length)) {
      b.push(...codificar(recuo + pedaco + "\n", config.codePage))
    }
  }

  b.push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x61, 0) // voltar ao normal
  b.push(0x0a, 0x0a, 0x0a, 0x0a) // avançar o papel (a impressora não tem corte)
  return new Uint8Array(b)
}

function nomeDoItem(item: OrderItem): string {
  const nome = item.categorySize
    ? `${item.categorySize.category.name} ${item.categorySize.name}`
    : (item.product?.name ?? item.name ?? "Item")
  return item.variant ? `${nome} (${item.variant.name})` : nome
}

// Detalhes abaixo do item: SEM, adicionais, pizza e observação.
function detalhesDoItem(item: OrderItem): Linha[] {
  const linhas: Linha[] = []

  // A observação vem do cardápio online como "SEM: ..." + texto livre (ver OrderItemNote).
  const partesDaNota = (item.note ?? "")
    .split(/\r?\n/)
    .map((parte) => parte.trim())
    .filter(Boolean)
  const sem = partesDaNota.filter((parte) => parte.startsWith("SEM:"))
  const observacao = partesDaNota.filter((parte) => !parte.startsWith("SEM:"))

  for (const parte of sem) linhas.push({ texto: parte, negrito: true, recuo: 3 })
  for (const extra of item.extras ?? []) linhas.push({ texto: `+ ${extra.name}`, recuo: 3 })
  if (item.flavors.length > 0) {
    linhas.push({ texto: `Sabores: ${item.flavors.map((sabor) => sabor.productName).join(", ")}`, recuo: 3 })
  }
  if (item.categoryCrust) linhas.push({ texto: `Borda: ${item.categoryCrust.name}`, recuo: 3 })
  if (observacao.length > 0) linhas.push({ texto: `Obs: ${observacao.join(" ")}`, recuo: 3 })

  return linhas
}

// Comanda completa do pedido, pronta para enviar à impressora.
export function montarComanda(pedido: Order, nomeDaLoja: string, config: PrinterSettings): Uint8Array {
  const divisor: Linha = { texto: "-".repeat(config.columns) }
  const entrega = Boolean(pedido.address)
  // O pedido não tem número sequencial: usamos o começo do id, igual em todo aparelho.
  const numero = pedido.id.slice(0, 6).toUpperCase()

  const linhas: Linha[] = [
    { texto: nomeDaLoja, centro: true, negrito: true, grande: true },
    divisor,
    { texto: `PEDIDO #${numero}`, negrito: true, grande: true },
    { texto: formatDate(pedido.createdAt) },
    { texto: `Tipo: ${entrega ? "Entrega" : "Retirada"}` },
    { texto: `Cliente: ${pedido.customerName}` },
  ]

  if (pedido.customerPhone) linhas.push({ texto: `Tel: ${pedido.customerPhone}` })
  if (entrega) linhas.push({ texto: `Endereço: ${pedido.address}` })

  linhas.push(divisor)

  for (const item of pedido.items) {
    linhas.push({ texto: `${item.quantity}x ${nomeDoItem(item)}`, negrito: true })
    linhas.push(...detalhesDoItem(item))
  }

  linhas.push(divisor)
  linhas.push({ texto: `Subtotal: ${formatPrice(pedido.subtotal)}` })
  if (entrega) linhas.push({ texto: `Taxa de entrega: ${formatPrice(pedido.deliveryFee)}` })
  linhas.push({ texto: `Pagamento: ${PAGAMENTO[pedido.paymentMethod] ?? pedido.paymentMethod}` })
  linhas.push({ texto: `TOTAL: ${formatPrice(pedido.total)}`, negrito: true, grande: true })
  linhas.push({ texto: "" })
  linhas.push({ texto: "Obrigado!", centro: true })

  return montar(linhas, config)
}

// Pedido de exemplo (dados inventados) para o botão "Imprimir teste".
// Tem acentos de propósito, para conferir a tabela de caracteres.
export function pedidoDeExemplo(): Order {
  return {
    id: "teste1048",
    customerName: "João da Silva",
    customerPhone: "(54) 99999-0000",
    address: "Rua das Flores, 123 - Centro",
    status: "preparo",
    subtotal: 5700,
    deliveryFee: 500,
    total: 6200,
    paymentMethod: "pix_manual",
    createdAt: new Date().toISOString(),
    cancelReason: null,
    canceledBy: null,
    items: [
      {
        id: "1",
        quantity: 1,
        unitPrice: 3300,
        note: "SEM: tomate, maionese\nPonto da carne bem passado, por favor. Coração, açaí, pão: ÀÁÂÃÉÊÍÓÔÕÚÇ",
        product: { id: "p1", name: "X Bacon" },
        variant: null,
        categorySize: null,
        categoryCrust: null,
        flavors: [],
        extras: [{ id: "e1", name: "Bacon extra", price: 400 }],
      },
      {
        id: "2",
        quantity: 2,
        unitPrice: 1200,
        note: null,
        product: { id: "p2", name: "Refrigerante 1 litro" },
        variant: null,
        categorySize: null,
        categoryCrust: null,
        flavors: [],
      },
    ],
  }
}
