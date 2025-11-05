import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  const { style = 'decimal', minimumFractionDigits = 2, maximumFractionDigits = 2, currency = 'BRL' } = options
  const formatter = new Intl.NumberFormat('pt-BR', {
    style,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  })
  return formatter.format(value)
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return formatter.format(value / 100)
}

export function formatInteger(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  const formatter = new Intl.NumberFormat('pt-BR')
  return formatter.format(value)
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value
  }
  if (typeof value === 'bigint') {
    const max = BigInt(Number.MAX_SAFE_INTEGER)
    const min = BigInt(Number.MIN_SAFE_INTEGER)
    if (value > max) {
      return Number.MAX_SAFE_INTEGER
    }
    if (value < min) {
      return Number.MIN_SAFE_INTEGER
    }
    return Number(value)
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}
