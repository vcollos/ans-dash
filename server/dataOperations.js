import { z } from 'zod'
import { createDataService } from '../src/lib/dataServiceCore.js'
import { metricSql } from '../src/lib/metricFormulas.js'
import { UNIODONTO_METRIC_SQL } from '../src/lib/metricFormulasModoUniodonto.js'
import { monetaryIndicatorColumns, monetaryIndicatorPhysicalColumns } from '../src/lib/monetaryIndicators.js'

const badRequest = () => { throw Object.assign(new Error('Operação ou parâmetros inválidos.'), { status: 400 }) }
const text = z.string().max(200).refine((v) => [...v].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127))
const year = z.number().int().min(1990).max(2200)
const quarter = z.number().int().min(1).max(4)
const regAns = z.union([z.string().regex(/^\d{6}$/), z.number().int().min(100000).max(999999)])
const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/)
const optionalText = text.nullish()
const filters = z.strictObject({
  anos: z.array(year).max(50).optional(), trimestres: z.array(quarter).max(4).optional(),
  modalidades: z.array(text).max(30).optional(), portes: z.array(text).max(10).optional(),
  regAns: z.array(regAns).max(100).optional(), ativa: z.boolean().nullish(), uniodonto: z.boolean().nullish(),
  search: optionalText, operatorName: optionalText,
}).default({})
const metric = z.enum([...new Set([...Object.keys(metricSql), ...Object.keys(UNIODONTO_METRIC_SQL), 'regulatory_score'])])
const money = z.enum([...new Set([...monetaryIndicatorColumns, ...monetaryIndicatorPhysicalColumns])])
const limit = z.number().int().min(1).max(10000).nullable().optional()
const order = z.enum(['ASC', 'DESC']).optional()
const rankingOptions = z.strictObject({ operatorName: optionalText }).default({})
const peerOptions = z.strictObject({ excludeOperatorName: optionalText }).default({})
const comparison = z.strictObject({ operatorName: optionalText, filters: filters.optional() }).nullish()
const tuple = (items) => ({ schema: z.tuple(items), arity: items.length })
const noArgs = tuple([])
const schemas = {
  assertDatasetReady: noArgs,
  fetchAvailablePeriods: noArgs,
  fetchOperatorOptions: tuple([z.strictObject({ anos: z.array(year).max(50).optional(), trimestres: z.array(quarter).max(4).optional() }).optional()]),
  fetchDashboardBootstrap: noArgs,
  fetchOperatorPeriods: tuple([optionalText]),
  fetchKpiSummary: tuple([filters]),
  fetchUniodontoPeerSummary: tuple([filters, peerOptions]),
  fetchAnsPeerSummary: tuple([filters, peerOptions]),
  fetchMonetarySummary: tuple([filters]),
  fetchRegulatoryReport: tuple([filters, filters]),
  fetchRegulatoryScoreForFilters: tuple([filters, filters]),
  fetchTrendSeries: tuple([metric, filters, comparison]),
  fetchUniodontoPerCapitaSeries: tuple([filters, z.strictObject({
    paymentModality: z.enum(['todos', 'preestabelecido', 'posestabelecido']).optional(),
    revenueBase: z.enum(['contraprestacao', 'receita_planos_odontologicos']).optional(),
  }).default({}), comparison]),
  fetchTrendSeriesBatch: tuple([z.array(metric).max(100), filters, comparison]),
  fetchOperatorSnapshot: tuple([optionalText, z.strictObject({ ano: year.optional(), trimestre: quarter.optional(), periodo: z.string().regex(/^\d{4}T[1-4]$/).optional() }).nullable().default({}), filters]),
  fetchOperatorLatestSnapshot: tuple([optionalText]),
  fetchRanking: tuple([metric, filters, limit, order, rankingOptions]),
  fetchUniodontoRanking: tuple([metric, filters, limit, order, rankingOptions]),
  fetchMonetaryRanking: tuple([money, filters, limit, order, rankingOptions]),
  fetchRegulatoryScoreRanking: tuple([filters, limit, order, rankingOptions]),
  fetchScatter: tuple([metric, metric, filters, z.number().int().min(1).max(10000).optional()]),
  fetchTableData: tuple([filters, z.strictObject({
    includeAllColumns: z.boolean().optional(), ignorePeriodFilters: z.boolean().optional(), operatorName: optionalText,
    columns: z.array(identifier).min(1).max(200).optional(),
    limit: z.number().int().min(1).max(10000).optional(), offset: z.number().int().min(0).max(1000000).optional(),
  }).default({})]),
  fetchTableColumns: noArgs,
}
export const DATA_OPERATIONS = Object.freeze(Object.keys(schemas))

export function validateDataOperation(body) {
  if (!body || Buffer.byteLength(JSON.stringify(body)) > 16384) badRequest()
  const envelope = z.strictObject({ operation: z.enum(DATA_OPERATIONS), args: z.array(z.unknown()).max(5) }).safeParse(body)
  if (!envelope.success) badRequest()
  const { operation, args } = envelope.data
  // JavaScript omitted trailing arguments retain the exact defaults of existing builders.
  const padded = [...args]
  const schema = schemas[operation]
  while (padded.length < schema.arity) padded.push(undefined)
  const parsed = schema.schema.safeParse(padded)
  if (!parsed.success) badRequest()
  return { operation, args: parsed.data }
}

function sourceName(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)?$/.test(value)) {
    throw new Error('Fonte de dados do servidor inválida.')
  }
  return value
}

// Server-controlled configuration only. Never accept table/view names from callers.
export function dataOperationEnvironment(env = process.env) {
  return Object.freeze({
    VITE_DATASET_VIEW: sourceName(env.BQ_EXPORT_VIEW ?? 'bigdata-467917.dash_ans.indicadores_curados_snapshot_consolidado'),
    VITE_MART_ANS_TABLE: sourceName(env.BQ_MART_ANS_TABLE || 'bigdata-467917.dash_ans.indicadores_mart_ans_consolidado'),
    VITE_MART_UNIODONTO_TABLE: sourceName(env.BQ_MART_UNIODONTO_TABLE || 'bigdata-467917.dash_ans.indicadores_mart_uniodonto_consolidado'),
    VITE_PRESTADORES_TABLE: sourceName(env.BQ_PRESTADORES_TABLE ?? 'bigdata-467917.dash_ans.prestadores_ativos_uniodonto_origem'),
    VITE_PRESTADORES_ORIGEM: 'PRÓPRIA',
    // Errors must not be memoized across operations or sessions.
    VITE_PRESTADORES_ERROR_TTL_MS: 0,
  })
}

export async function executeDataOperation({ body, access, executeQuery, env }) {
  if (!access?.sso || access.enforced !== true || access.allowedRegAns?.length !== 1 || !/^\d{6}$/.test(access.allowedRegAns[0])) {
    throw Object.assign(new Error('Acesso SSO necessário.'), { status: 403 })
  }
  const { operation, args } = validateDataOperation(body)
  const trustedEnv = dataOperationEnvironment(env)
  const allowedSources = new Set(Object.values(trustedEnv).filter((v) => typeof v === 'string' && v !== 'PRÓPRIA').map((s) => `\`${s}\``))
  const scopeSource = (source) => {
    if (!allowedSources.has(source)) throw new Error('Fonte não autorizada pelo servidor.')
    // Both source and tenant are server-owned and validated. Filter each relation
    // before aggregates, joins, ranking and metadata reads; never rewrite client SQL.
    return `(SELECT * FROM ${source} WHERE CAST(reg_ans AS STRING) = '${access.allowedRegAns[0]}')`
  }
  // One engine per authenticated request: result/metadata/inflight caches cannot
  // outlive revocation checks or cross principal, grant or operator boundaries.
  const service = createDataService({ env: trustedEnv, executeQuery, scopeSource })
  return service[operation](...args)
}
