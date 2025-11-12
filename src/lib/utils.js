import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const RECEITA_PATTERNS = /(receita|cr[eé]dito|resultado liquido|resultado líquido|outras receitas)/i
const DESPESA_PATTERNS = /(despesa|evento assistencial|evento a liquidar|provis[aã]o)/i
const ATIVO_PATTERNS = /(ativo|patrim[oô]nio|\bpl\b|capital|ativos garantidores)/i
const PASSIVO_PATTERNS = /(passivo|obriga[cç][aã]o|provis[aã]o)/i

export function getVariationColor(indicador, variacao) {
  if (!variacao || variacao === '—') {
    return ''
  }
  const normalizedNumber = Number(
    variacao
      .replace(/−/g, '-')
      .replace(/[%\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  )
  if (!Number.isFinite(normalizedNumber) || Math.abs(normalizedNumber) < 0.005) {
    return ''
  }
  const name = (indicador ?? '')
    .normalize('NFD')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .trim()

  if (RECEITA_PATTERNS.test(name)) {
    return normalizedNumber > 0 ? 'text-emerald-600' : 'text-red-600'
  }
  if (DESPESA_PATTERNS.test(name)) {
    return normalizedNumber > 0 ? 'text-red-600' : 'text-emerald-600'
  }
  if (ATIVO_PATTERNS.test(name)) {
    return normalizedNumber > 0 ? 'text-emerald-600' : 'text-red-600'
  }
  if (PASSIVO_PATTERNS.test(name)) {
    return normalizedNumber > 0 ? 'text-red-600' : 'text-emerald-600'
  }
  return ''
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
