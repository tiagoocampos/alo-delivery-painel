/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_API: string
  readonly VITE_STOREFRONT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
