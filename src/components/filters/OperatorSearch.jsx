import { useEffect, useMemo, useRef, useState } from 'react'
import { Label } from '../ui/label'
import { Input } from '../ui/input'

function OperatorSearch({
  label,
  value = '',
  onChange,
  onSelect,
  options = [],
  placeholder = 'Nome ou parte do nome',
  emptyText = 'Nenhuma operadora encontrada.',
}) {
  const [query, setQuery] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const closeTimeoutRef = useRef(null)

  useEffect(() => {
    setQuery(value ?? '')
  }, [value])

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const filteredOptions = useMemo(() => {
    if (!options.length) {
      return []
    }
    const normalizedQuery = (query ?? '').toLowerCase().trim()
    const filtered = normalizedQuery
      ? options.filter((option) => option?.toLowerCase().includes(normalizedQuery))
      : options
    return filtered.slice(0, 50)
  }, [options, query])

  const handleSelect = (option) => {
    setQuery(option)
    onChange(option)
    if (onSelect) {
      onSelect(option)
    }
    setOpen(false)
  }

  const handleFocus = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    setOpen(true)
  }

  const handleBlur = () => {
    const normalized = (query ?? '').toLowerCase().trim()
    if (normalized) {
      const exactMatch = options.find((option) => option?.toLowerCase() === normalized)
      if (exactMatch) {
        handleSelect(exactMatch)
        return
      }
      if (normalized.length >= 4 && filteredOptions.length === 1) {
        handleSelect(filteredOptions[0])
        return
      }
    }
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value
            setQuery(nextValue)
            onChange(nextValue)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            const normalized = (query ?? '').toLowerCase().trim()
            if (!normalized) return
            const exactMatch = options.find((option) => option?.toLowerCase() === normalized)
            if (exactMatch) {
              event.preventDefault()
              handleSelect(exactMatch)
              return
            }
            if (filteredOptions.length === 1) {
              event.preventDefault()
              handleSelect(filteredOptions[0])
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="h-9"
        />
        {open ? (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover text-sm shadow-lg">
            {filteredOptions.length ? (
              <ul>
                {filteredOptions.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        handleSelect(option)
                      }}
                      className="flex w-full cursor-pointer items-center px-3 py-2 text-left hover:bg-muted"
                    >
                      <span className="truncate">{option}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-muted-foreground">{emptyText}</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default OperatorSearch
