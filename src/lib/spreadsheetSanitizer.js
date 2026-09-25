// SheetJS keeps formulas without a saved result as stub cells when sheetStubs is enabled.
// Evaluate only basic arithmetic over cells in the same worksheet; never run formula text.
export function resolveMissingFormulaResults(sheet, maxRow = Infinity, targetColumn = null) {
  const resolved = new Map()
  const resolving = new Set()

  function readCell(address) {
    if (resolved.has(address)) return resolved.get(address)
    if (resolving.has(address)) throw new Error(`Referência circular na fórmula de ${address}.`)
    const cell = sheet[address]
    if (!cell) return 0
    if (!(cell.t === 'z' && cell.f)) {
      const value = cell.v === undefined || cell.v === null || cell.v === '' ? 0 : Number(cell.v)
      if (!Number.isFinite(value)) throw new Error(`Valor não numérico na fórmula de ${address}.`)
      return value
    }

    resolving.add(address)
    try {
      const formula = cell.f.toUpperCase().replace(/\$/g, '')
      const tokens = formula.match(/\s*(?:[A-Z]{1,3}[1-9]\d*|\d+(?:\.\d+)?|[()+-])/g)
      if (!tokens || tokens.join('').replace(/\s/g, '') !== formula.replace(/\s/g, '')) {
        throw new Error(`Fórmula não suportada em ${address}. Salve o arquivo com os resultados calculados.`)
      }
      const parts = tokens.map((token) => token.trim())
      let index = 0
      function factor() {
        const token = parts[index++]
        if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * factor()
        if (token === '(') {
          const value = expression()
          if (parts[index++] !== ')') throw new Error('Parênteses inválidos')
          return value
        }
        if (/^[A-Z]{1,3}[1-9]\d*$/.test(token ?? '')) return readCell(token)
        if (/^\d+(?:\.\d+)?$/.test(token ?? '')) return Number(token)
        throw new Error('Expressão inválida')
      }
      function expression() {
        let value = factor()
        while (parts[index] === '+' || parts[index] === '-') {
          const operator = parts[index++]
          value += (operator === '+' ? 1 : -1) * factor()
        }
        return value
      }
      const value = expression()
      if (index !== parts.length || !Number.isFinite(value)) throw new Error('Resultado inválido')
      resolved.set(address, value)
      return value
    } catch (error) {
      if (error.message.startsWith('Fórmula não suportada') || error.message.startsWith('Referência circular')) throw error
      throw new Error(`Não foi possível calcular ${address}. Salve o arquivo com os resultados calculados.`)
    } finally {
      resolving.delete(address)
    }
  }

  for (const [address, cell] of Object.entries(sheet)) {
    const row = Number(address.match(/\d+$/)?.[0])
    if (cell?.t === 'z' && cell.f && row <= maxRow && (!targetColumn || address.match(/^[A-Z]+/)?.[0] === targetColumn)) {
      const value = readCell(address)
      cell.t = 'n'
      cell.v = value
      cell.w = String(value)
    }
  }
}

export function stripTrailingBalanceteSummary(rows, resolveInputFieldName) {
  const accountCode = (row) => Object.entries(row).find(([header]) => resolveInputFieldName(header) === 'cd_conta_contabil')?.[1]
  const lastAccountIndex = rows.findLastIndex((row) => String(accountCode(row) ?? '').trim() !== '')
  const footer = rows.slice(lastAccountIndex + 1)
  if (!footer.length) return rows
  const first = footer[0]
  const repeatedHeader = Object.entries(first).some(([header, value]) =>
    resolveInputFieldName(header) === 'vl_saldo_final' && resolveInputFieldName(value) === 'vl_saldo_final')
  return repeatedHeader && footer.every((row) => String(accountCode(row) ?? '').trim() === '')
    ? rows.slice(0, lastAccountIndex + 1)
    : rows
}
