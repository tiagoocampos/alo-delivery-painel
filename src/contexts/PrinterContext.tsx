import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { loadPrinterSettings, savePrinterSettings, type PrinterSettings } from "@/lib/printer/settings"

// Conexão com a impressora térmica pela Web Serial API (Edge/Chrome no computador).
// A impressora Bluetooth pareada no Windows aparece como uma porta COM.
// Guia: https://developer.chrome.com/docs/capabilities/serial

const BAUD_RATE = 9600
// Se a impressora sumir no meio da impressão, a escrita pode travar: desistimos depois disso.
const WRITE_TIMEOUT_MS = 15_000
const OPEN_ERROR = "Não consegui abrir a impressora. Veja se ela está ligada e se não está aberta em outra aba."

// "silent": só reabre uma porta já autorizada antes (sem janela; serve ao abrir o painel).
// "user": igual, mas se nunca autorizou abre a janela de escolha (precisa de clique).
// "choose": sempre abre a janela de escolha (para trocar de porta/impressora).
export type ConnectMode = "silent" | "user" | "choose"

// Celular fica de fora mesmo que o navegador tenha a API: a impressão é pensada para o computador.
const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const supported = typeof navigator !== "undefined" && Boolean(navigator.serial) && !isMobile

interface PrinterContextValue {
  supported: boolean
  connected: boolean
  connecting: boolean
  // true quando a impressora estava conectada e sumiu (mostra "Reconectar").
  lost: boolean
  settings: PrinterSettings
  updateSettings: (patch: Partial<PrinterSettings>) => void
  connect: (mode: ConnectMode) => Promise<boolean>
  disconnect: () => Promise<void>
  print: (bytes: Uint8Array) => Promise<void>
}

const PrinterContext = createContext<PrinterContextValue | null>(null)

export function PrinterProvider({ children }: { children: ReactNode }) {
  const portRef = useRef<SerialPort | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [lost, setLost] = useState(false)
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings)

  // Abre a porta a 9600. Se ela já estiver aberta nesta aba, só reaproveita.
  async function openPort(port: SerialPort) {
    if (!port.writable) await port.open({ baudRate: BAUD_RATE })
    portRef.current = port
    setConnected(true)
    setLost(false)
  }

  // Fecha a porta direito, para ela não ficar presa
  // (senão aparece "Failed to open serial port" ao abrir de novo).
  async function closePort() {
    const port = portRef.current
    portRef.current = null
    setConnected(false)
    if (!port) return
    try {
      await port.close()
    } catch {
      // A porta já estava fechada ou a impressora sumiu: nada a fazer.
    }
  }

  async function connect(mode: ConnectMode): Promise<boolean> {
    const serial = navigator.serial
    if (!supported || !serial) return false
    if (mode !== "choose" && portRef.current?.writable) return true

    setConnecting(true)
    try {
      if (mode !== "choose") {
        // Portas que o lojista já autorizou antes: reabre sem perguntar.
        const knownPorts = await serial.getPorts()
        for (const port of knownPorts) {
          try {
            await openPort(port)
            return true
          } catch {
            // Essa não abriu (impressora desligada ou porta em uso): tenta a próxima.
          }
        }
        if (knownPorts.length > 0) {
          if (mode === "user") toast.error(OPEN_ERROR, { position: "top-center" })
          return false
        }
        if (mode === "silent") return false
      }

      // Janela do navegador para escolher a porta. Só funciona a partir de um clique.
      let port: SerialPort
      try {
        port = await serial.requestPort()
      } catch {
        return false // o lojista fechou a janela sem escolher: não é erro
      }

      await closePort()
      try {
        await openPort(port)
        return true
      } catch {
        toast.error(OPEN_ERROR, { position: "top-center" })
        return false
      }
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    await closePort()
    setLost(false)
  }

  // Envia os bytes para a impressora. Lança erro se não conseguir.
  async function print(bytes: Uint8Array) {
    const port = portRef.current
    if (!port?.writable) throw new Error("Impressora desconectada")

    const writer = port.writable.getWriter()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Tempo esgotado")), WRITE_TIMEOUT_MS)
      })
      await Promise.race([writer.write(bytes), timeout])
    } catch (error) {
      // Falhou ao escrever: marca como desconectada para o lojista reconectar.
      await writer.abort().catch(() => {})
      writer.releaseLock()
      await closePort()
      setLost(true)
      throw error
    } finally {
      clearTimeout(timer)
    }
    writer.releaseLock()
  }

  function updateSettings(patch: Partial<PrinterSettings>) {
    setSettings((current) => {
      const next = { ...current, ...patch }
      savePrinterSettings(next)
      return next
    })
  }

  useEffect(() => {
    const serial = navigator.serial
    if (!supported || !serial) return

    // Ao abrir o painel, tenta reabrir sozinho a impressora já autorizada.
    connect("silent")

    // A impressora sumiu (desligou, saiu do alcance do Bluetooth...).
    function handleDisconnect(event: Event) {
      if (event.target !== portRef.current) return
      portRef.current = null
      setConnected(false)
      setLost(true)
    }

    // Uma porta autorizada voltou: tenta reabrir sem perguntar.
    function handleConnect() {
      if (!portRef.current) connect("silent")
    }

    serial.addEventListener("disconnect", handleDisconnect)
    serial.addEventListener("connect", handleConnect)
    return () => {
      serial.removeEventListener("disconnect", handleDisconnect)
      serial.removeEventListener("connect", handleConnect)
    }
    // Roda uma vez só, ao montar o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PrinterContext.Provider
      value={{ supported, connected, connecting, lost, settings, updateSettings, connect, disconnect, print }}
    >
      {children}
    </PrinterContext.Provider>
  )
}

export function usePrinter(): PrinterContextValue {
  const context = useContext(PrinterContext)
  if (!context) throw new Error("usePrinter must be used within a PrinterProvider")
  return context
}
