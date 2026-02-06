import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '../../lib/utils'

/**
 * `scrollbars`:
 * - "vertical" (default): only a vertical scrollbar
 * - "horizontal": only a horizontal scrollbar
 * - "both": show both scrollbars (useful for wide tables)
 */
const ScrollArea = React.forwardRef(
  (
    {
      className,
      viewportClassName,
      children,
      scrollbars = 'vertical',
      // Radix default is "hover"; we keep that so most UIs don't get visually noisy.
      type = 'hover',
      viewportRef = null,
      ...props
    },
    ref,
  ) => {
    const showVertical = scrollbars === 'vertical' || scrollbars === 'both'
    const showHorizontal = scrollbars === 'horizontal' || scrollbars === 'both'

    return (
      <ScrollAreaPrimitive.Root ref={ref} type={type} className={cn('relative overflow-hidden', className)} {...props}>
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className={cn('h-full w-full rounded-[inherit]', viewportClassName)}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        {showVertical ? <ScrollBar orientation="vertical" /> : null}
        {showHorizontal ? <ScrollBar orientation="horizontal" /> : null}
        {showVertical && showHorizontal ? <ScrollAreaPrimitive.Corner /> : null}
      </ScrollAreaPrimitive.Root>
    )
  },
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none p-[2px] transition-colors data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:w-full',
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/55 active:bg-muted-foreground/60" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
