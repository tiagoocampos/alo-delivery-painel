// Tipos mínimos da Web Serial API (Edge/Chrome). O TypeScript ainda não traz
// esses tipos no "lib.dom", então declaramos só o que o painel usa.
// Referência: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

interface SerialPort extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null
  readonly writable: WritableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
}

interface Serial extends EventTarget {
  requestPort(): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
  addEventListener(type: "connect" | "disconnect", listener: (event: Event) => void): void
  removeEventListener(type: "connect" | "disconnect", listener: (event: Event) => void): void
}

interface Navigator {
  readonly serial?: Serial
}
