import { asPortNumber, asTimeoutMs } from '../types/branded'
import type { PlcConfig } from '../types/domain'

function envInt(key: string, fallback: number): number {
  const raw = import.meta.env[key]
  if (raw === undefined || raw === '') return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function envStr(key: string, fallback: string): string {
  const raw: string = import.meta.env[key]
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback
}

export const MELSEC_CONFIG: PlcConfig = {
  host: envStr('VITE_MELSEC_HOST', '127.0.0.1'),
  port: asPortNumber(envInt('VITE_MELSEC_PORT', 8502)),
  timeoutMs: asTimeoutMs(envInt('VITE_TIMEOUT_MS', 3000)),
}

export const KEYENCE_CONFIG: PlcConfig = {
  host: envStr('VITE_KEYENCE_HOST', '127.0.0.1'),
  port: asPortNumber(envInt('VITE_KEYENCE_PORT', 8503)),
  timeoutMs: asTimeoutMs(envInt('VITE_TIMEOUT_MS', 3000)),
}

export const POLLING_INTERVAL_MS = envInt('VITE_INTERVAL_MS', 500)
