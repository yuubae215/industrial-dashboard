/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MELSEC_HOST: string
  readonly VITE_MELSEC_PORT: string
  readonly VITE_KEYENCE_HOST: string
  readonly VITE_KEYENCE_PORT: string
  readonly VITE_TIMEOUT_MS: string
  readonly VITE_INTERVAL_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
