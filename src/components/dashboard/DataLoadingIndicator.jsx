import { useEffect, useState } from 'react'
import { Progress } from '../ui/progress'
import { cn } from '../../lib/utils'

function DataLoadingIndicator({
  isActive = false,
  label = 'Carregando dados atualizados',
  description = 'Aguarde enquanto aplicamos os filtros selecionados.',
  className,
}) {
  const [value, setValue] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let intervalId = null
    let timeoutId = null
    if (isActive) {
      setVisible(true)
      setValue((prev) => (prev <= 0 ? 12 : prev))
      intervalId = setInterval(() => {
        setValue((prev) => {
          if (prev >= 92) return prev
          const nextIncrement = Math.random() * 12
          const nextValue = prev + nextIncrement
          return nextValue > 92 ? 92 : nextValue
        })
      }, 500)
    } else if (visible) {
      setValue(100)
      timeoutId = setTimeout(() => {
        setVisible(false)
        setValue(0)
      }, 500)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isActive, visible])

  if (!visible) {
    return null
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-semibold text-foreground">{Math.round(value)}%</span>
      </div>
      <div className="mt-3">
        <Progress value={value} />
      </div>
    </div>
  )
}

export default DataLoadingIndicator
