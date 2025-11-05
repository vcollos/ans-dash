import { useMemo, useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'

function MultiSelect({ label, values = [], options = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) {
      return options
    }
    return options.filter((option) => option?.toString().toLowerCase().includes(query.toLowerCase()))
  }, [options, query])

  function toggleValue(value) {
    const exists = values.includes(value)
    if (exists) {
      onChange(values.filter((item) => item !== value))
    } else {
      onChange([...values, value])
    }
  }

  function clearValues() {
    onChange([])
  }

  const triggerLabel =
    values.length === 0
      ? label
      : `${label} (${values.length})`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Filtrar..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="ghost" size="icon" onClick={clearValues} disabled={!values.length}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-44 pr-2">
          <div className="space-y-2">
            {filtered.map((option) => {
              const checked = values.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleValue(option)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                >
                  <span>{option}</span>
                  {checked ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> selecionado
                    </Badge>
                  ) : null}
                </button>
              )
            })}
            {!filtered.length ? <p className="text-sm text-muted-foreground">Nenhuma opção encontrada.</p> : null}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export default MultiSelect
