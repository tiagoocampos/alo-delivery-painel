// Configurações da impressora: ficam só neste computador (localStorage),
// não vão para o backend.

export type CodePage = 71 | 55 // 71 = WPC1252 (Latin-1), 55 = OEM860 (português)
export type PaperColumns = 32 | 48 // 58 mm = 32 colunas, 80 mm = 48 colunas

export interface PrinterSettings {
  autoPrint: boolean
  codePage: CodePage
  columns: PaperColumns
}

const STORAGE_KEY = "printerSettings"

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  autoPrint: false,
  codePage: 71,
  columns: 32,
}

export function loadPrinterSettings(): PrinterSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    return {
      autoPrint: saved.autoPrint === true,
      codePage: saved.codePage === 55 ? 55 : 71,
      columns: saved.columns === 48 ? 48 : 32,
    }
  } catch {
    return DEFAULT_PRINTER_SETTINGS
  }
}

export function savePrinterSettings(settings: PrinterSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage cheio ou bloqueado: a configuração vale só até recarregar.
  }
}
