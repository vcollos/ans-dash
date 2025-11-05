import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { formatNumber, formatPercent, formatInteger } from '../../lib/utils'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react'

const columnDefinitions = [
  {
    accessorKey: 'nome_operadora',
    header: 'Operadora',
  },
  {
    accessorKey: 'modalidade',
    header: 'Modalidade',
  },
  {
    accessorKey: 'porte',
    header: 'Porte',
  },
  {
    accessorKey: 'ano',
    header: 'Ano',
    cell: ({ getValue }) => formatInteger(getValue()),
  },
  {
    accessorKey: 'trimestre',
    header: 'Trim.',
    cell: ({ getValue }) => formatInteger(getValue()),
  },
  {
    accessorKey: 'qt_beneficiarios',
    header: 'Beneficiário',
    cell: ({ getValue }) => formatInteger(getValue()),
  },
  {
    accessorKey: 'sinistralidade_pct',
    header: 'Sinistralidade (%)',
    cell: ({ getValue }) => formatPercent(getValue() ?? 0, 2),
  },
  {
    accessorKey: 'margem_lucro_pct',
    header: 'Margem (%)',
    cell: ({ getValue }) => formatPercent(getValue() ?? 0, 2),
  },
  {
    accessorKey: 'liquidez_corrente',
    header: 'Liquidez',
    cell: ({ getValue }) => formatNumber(getValue(), { maximumFractionDigits: 2 }),
  },
  {
    accessorKey: 'resultado_liquido',
    header: 'Resultado Líquido',
    cell: ({ getValue }) => formatNumber(getValue(), { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
  {
    accessorKey: 'vr_contraprestacoes',
    header: 'Contraprestações',
    cell: ({ getValue }) => formatNumber(getValue(), { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
  {
    accessorKey: 'vr_eventos_liquidos',
    header: 'Eventos líquidos',
    cell: ({ getValue }) => formatNumber(getValue(), { style: 'currency', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
]

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

function DataTable({ rows, isLoading }) {
  const [sorting, setSorting] = useState([])

  const columns = useMemo(() => columnDefinitions, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento por Operadora</CardTitle>
        <p className="text-sm text-muted-foreground">
          Os dados abaixo são limitados a 500 linhas para agilizar a navegação. Aplique filtros para análises específicas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <ScrollArea className="h-[420px]">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3 py-2 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {header.isPlaceholder ? null : <SortButton header={header} />}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      Carregando dados...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      Nenhum resultado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

export default DataTable
