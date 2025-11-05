import { toNumber } from './utils'

export function tableToObjects(table) {
  const rows = []
  const columns = table.schema.fields.map((field) => field.name)
  const columnVectors = columns.map((column) => table.getChild(column))
  for (let rowIndex = 0; rowIndex < table.numRows; rowIndex += 1) {
    const row = {}
    for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
      const value = columnVectors[colIndex]?.get(rowIndex)
      const columnName = columns[colIndex]
      if (typeof value === 'bigint') {
        row[columnName] = toNumber(value)
      } else {
        row[columnName] = value ?? null
      }
    }
    rows.push(row)
  }
  return rows
}
