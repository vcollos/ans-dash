import { useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react'
import { DETAIL_TABLE_FIELDS } from '../../lib/dataService'
import { formatInteger, formatNumber, formatPercent, toNumber } from '../../lib/utils'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

const fieldLabels = {
  nome_operadora: 'Operadora',
  modalidade: 'Modalidade',
  porte: 'Porte',
  ano: 'Ano',
  trimestre: 'Trimestre',
  qt_beneficiarios: 'Beneficiários',
  reg_ans: 'Registro ANS',
  ativa: 'Situação cadastral',
  uniodonto: 'Operadora Uniodonto',
  periodo: 'Período',
  periodo_id: 'Sequência do Período',
  trimestre_rank: 'Rank do Trimestre',
  sinistralidade_pct: 'Sinistralidade (%)',
  margem_lucro_pct: 'Margem Líquida (%)',
  despesas_adm_pct: 'Despesas Administrativas (%)',
  despesas_comerciais_pct: 'Despesas Comerciais (%)',
  despesas_tributarias_pct: 'Despesas Tributárias (%)',
  despesas_operacionais_pct: 'Despesas Operacionais (%)',
  indice_resultado_financeiro_pct: 'Resultado Financeiro (%)',
  resultado_liquido: 'Resultado Líquido (R$)',
  resultado_financeiro: 'Resultado Financeiro (R$)',
  liquidez_corrente: 'Liquidez Corrente',
  liquidez_seca: 'Liquidez Seca',
  endividamento_pct: 'Endividamento (%)',
  imobilizacao_pl_pct: 'Imobilização do PL (%)',
  retorno_pl_pct: 'Retorno sobre PL (%)',
  capital_terceiros_sobre_pl: 'Capital de Terceiros / PL',
  cobertura_provisoes: 'Cobertura de Provisões',
  margem_solvencia: 'Margem de Solvência',
  pmcr: 'PMCR',
  pmpe: 'PMPE',
  vr_contraprestacoes: 'Receitas de Contraprestações',
  vr_contraprestacoes_efetivas: 'Contraprestações Efetivas (3111)',
  vr_corresponsabilidade_cedida: 'Corresponsabilidade Cedida (3117)',
  vr_receitas: 'Receitas Totais',
  vr_despesas: 'Despesas Totais',
  vr_receitas_patrimoniais: 'Receitas Patrimoniais',
  vr_contraprestacoes_pre: 'Receitas de Contraprestações (Pré)',
  vr_creditos_operacoes_saude: 'Créditos Operações Saúde',
  vr_eventos_liquidos: 'Eventos Assistenciais Líquidos',
  vr_eventos_a_liquidar: 'Eventos a Liquidar',
  vr_desp_comerciais: 'Despesas Comerciais',
  vr_desp_comerciais_promocoes: 'Despesas Comerciais (Promoções)',
  vr_desp_administrativas: 'Despesas Administrativas',
  vr_outras_desp_oper: 'Outras Despesas Operacionais',
  vr_desp_tributos: 'Despesas com Tributos',
  vr_receitas_fin: 'Receitas Financeiras',
  vr_despesas_fin: 'Despesas Financeiras',
  vr_outras_receitas_operacionais: 'Outras Receitas Operacionais',
  vr_ativo_circulante: 'Ativo Circulante',
  vr_ativo_permanente: 'Ativo Permanente',
  vr_passivo_circulante: 'Passivo Circulante',
  vr_passivo_nao_circulante: 'Passivo Não Circulante',
  vr_patrimonio_liquido: 'Patrimônio Líquido',
  vr_ativos_garantidores: 'Ativos Garantidores',
  vr_provisoes_tecnicas: 'Provisões Técnicas',
  vr_pl_ajustado: 'PL Ajustado',
  vr_margem_solvencia_exigida: 'Margem de Solvência Exigida',
}

const percentFields = new Set([
  'sinistralidade_pct',
  'margem_lucro_pct',
  'despesas_adm_pct',
  'despesas_comerciais_pct',
  'despesas_tributarias_pct',
  'despesas_operacionais_pct',
  'retorno_pl_pct',
  'indice_resultado_financeiro_pct',
  'endividamento_pct',
  'imobilizacao_pl_pct',
])

const currencyFields = new Set([
  'resultado_financeiro',
  'resultado_liquido',
  'vr_contraprestacoes',
  'vr_contraprestacoes_efetivas',
  'vr_corresponsabilidade_cedida',
  'vr_receitas',
  'vr_despesas',
  'vr_receitas_patrimoniais',
  'vr_contraprestacoes_pre',
  'vr_creditos_operacoes_saude',
  'vr_eventos_liquidos',
  'vr_eventos_a_liquidar',
  'vr_desp_comerciais',
  'vr_desp_comerciais_promocoes',
  'vr_desp_administrativas',
  'vr_outras_desp_oper',
  'vr_desp_tributos',
  'vr_receitas_fin',
  'vr_despesas_fin',
  'vr_outras_receitas_operacionais',
  'vr_ativo_circulante',
  'vr_ativo_permanente',
  'vr_passivo_circulante',
  'vr_passivo_nao_circulante',
  'vr_patrimonio_liquido',
  'vr_ativos_garantidores',
  'vr_provisoes_tecnicas',
  'vr_pl_ajustado',
  'vr_margem_solvencia_exigida',
])

const integerFields = new Set(['ano', 'trimestre', 'qt_beneficiarios', 'reg_ans', 'periodo_id', 'trimestre_rank'])
const decimalFields = new Set(['liquidez_corrente', 'liquidez_seca', 'cobertura_provisoes', 'margem_solvencia', 'pmcr', 'pmpe', 'capital_terceiros_sobre_pl'])
const booleanFields = new Set(['ativa', 'uniodonto'])

const fallbackFieldOrder = DETAIL_TABLE_FIELDS

const mobileFieldPreference = [
  'nome_operadora',
  'modalidade',
  'porte',
  'reg_ans',
  'qt_beneficiarios',
  'sinistralidade_pct',
  'margem_lucro_pct',
  'liquidez_corrente',
  'resultado_liquido',
  'resultado_financeiro',
]

function getLabel(field) {
  if (fieldLabels[field]) {
    return fieldLabels[field]
  }
  const suffix = field.endsWith('_pct') ? ' (%)' : ''
  const baseName = field.replace(/_pct$/, '')
  const formatted = baseName
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
  return `${formatted}${suffix}`.trim()
}

function formatField(field, value) {
  if (value === null || value === undefined) {
    return '—'
  }
  if (booleanFields.has(field)) {
    if (value === true) return 'Sim'
    if (value === false) return 'Não'
    return '—'
  }
  const numeric = toNumber(value, null)
  if (numeric === null) {
    return typeof value === 'string' && value.trim() === '' ? '—' : value
  }
  if (percentFields.has(field)) {
    return formatPercent(numeric, 2)
  }
  if (currencyFields.has(field)) {
    return formatNumber(numeric, { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  if (integerFields.has(field)) {
    return formatInteger(numeric)
  }
  if (decimalFields.has(field)) {
    return formatNumber(numeric, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (Number.isInteger(numeric)) {
    return formatInteger(numeric)
  }
  return formatNumber(numeric, { maximumFractionDigits: 4 })
}

function buildColumn(field) {
  return {
    accessorKey: field,
    header: getLabel(field),
    cell: ({ getValue }) => formatField(field, getValue()),
  }
}

function SortButton({ header }) {
  const column = header.column
  const isSorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
    >
      {flexRender(column.columnDef.header, header.getContext())}
      {isSorted === 'asc' ? <ArrowUpNarrowWide className="ml-2 h-4 w-4" /> : null}
      {isSorted === 'desc' ? <ArrowDownNarrowWide className="ml-2 h-4 w-4" /> : null}
    </Button>
  )
}

function DataTable({ rows, columns = [], isLoading }) {
  const [sorting, setSorting] = useState([])

  const effectiveFields = useMemo(() => {
    if (columns && columns.length) {
      return columns
    }
    return fallbackFieldOrder
  }, [columns])

  const tableColumns = useMemo(() => effectiveFields.map(buildColumn), [effectiveFields])

  const mobileFields = useMemo(() => {
    const preferred = mobileFieldPreference.filter((field) => effectiveFields.includes(field))
    if (preferred.length) {
      return preferred
    }
    return effectiveFields.slice(0, Math.min(effectiveFields.length, 8))
  }, [effectiveFields])

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const tableRows = table.getRowModel().rows
  const hasRows = tableRows.length > 0

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Carregando dados...
          </div>
        ) : !hasRows ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Nenhum resultado para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="space-y-3 xl:hidden">
              {tableRows.map((row) => {
                const name = formatField('nome_operadora', row.getValue('nome_operadora'))
                const yearValue = row.getValue('ano')
                const quarterValue = row.getValue('trimestre')
                const periodPieces = []
                if (yearValue !== undefined && yearValue !== null) {
                  periodPieces.push(formatField('ano', yearValue))
                }
                if (quarterValue !== undefined && quarterValue !== null) {
                  periodPieces.push(`T${formatField('trimestre', quarterValue)}`)
                }
                const periodLabel = periodPieces.join(' • ')

                return (
                  <div key={row.id} className="rounded-lg border border-border/60 bg-background/60 p-3 shadow-sm">
                    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
                      <span className="text-sm font-semibold">{name}</span>
                      <span className="text-xs uppercase text-muted-foreground">{periodLabel || '—'}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {mobileFields
                        .filter((field) => field !== 'nome_operadora')
                        .map((field) => (
                          <div key={field} className="flex flex-col rounded-md bg-muted/40 p-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {getLabel(field)}
                            </span>
                            <span className="text-sm font-medium">
                              {formatField(field, row.getValue(field))}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="hidden xl:block">
              <div className="rounded-md border">
                <div className="w-full overflow-x-auto">
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="min-w-[960px] caption-bottom text-sm">
                      <thead className="sticky top-0 z-10 bg-background">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="px-3 py-2 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                              >
                                {header.isPlaceholder ? null : <SortButton header={header} />}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {tableRows.map((row) => (
                          <tr key={row.id} className="border-t">
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-3 py-2 align-middle whitespace-nowrap">
                                {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default DataTable
