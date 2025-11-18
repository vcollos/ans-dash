import { Pool } from 'pg'
import { metricFormulas, metricSql } from '../src/lib/metricFormulas.js'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://ansdashboard:ansdashboard@localhost:5432/ans_dashboard'
const SOURCE_VIEW = process.env.METRICS_SOURCE_VIEW ?? 'indicadores_curados'
const TARGET_VIEW = process.env.METRICS_VIEW ?? 'indicadores_metricas'

const metricColumns = metricFormulas.map((metric) => {
  const expression = metricSql[metric.id]?.trim()
  if (!expression) return null
  return `(${expression}) AS ${metric.id}`
}).filter(Boolean)

const metricProjection = metricColumns.length ? `,\n  ${metricColumns.join(',\n  ')}` : ''

async function materialize() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  try {
    console.log(`[materialize] Conectando em ${DATABASE_URL}`)
    await pool.query(`DROP MATERIALIZED VIEW IF EXISTS ${TARGET_VIEW} CASCADE`)
    console.log(`[materialize] Criando materialized view ${TARGET_VIEW} a partir de ${SOURCE_VIEW}...`)
    await pool.query(`
      CREATE MATERIALIZED VIEW ${TARGET_VIEW} AS
      SELECT
        base.*${metricProjection}
      FROM ${SOURCE_VIEW} base
    `)
    console.log('[materialize] Criando índices...')
    await pool.query(`CREATE UNIQUE INDEX ${TARGET_VIEW}_pk ON ${TARGET_VIEW} (reg_ans, ano, trimestre)`)
    await pool.query(`CREATE INDEX ${TARGET_VIEW}_periodo_idx ON ${TARGET_VIEW} (ano DESC, trimestre DESC)`)
    await pool.query(`CREATE INDEX ${TARGET_VIEW}_nome_operadora_idx ON ${TARGET_VIEW} (nome_operadora)`)
    console.log('[materialize] Finalizado com sucesso.')
  } catch (err) {
    console.error('[materialize] Falha ao gerar materialized view', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

materialize()
