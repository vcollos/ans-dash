import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import documentationSource from '../../assets/documentacao.md?raw'
import MarkdownRenderer from './MarkdownRenderer'
import { extractMarkdownHeadings } from './markdownHeadings'

function buildToc(headings) {
  return headings
    .filter((h) => h.level >= 2 && h.level <= 3)
    .map((h) => ({ ...h, indent: h.level === 2 ? 0 : 1 }))
}

function useActiveSection(slugs) {
  const [active, setActive] = useState(slugs[0] ?? null)

  useEffect(() => {
    if (typeof window === 'undefined' || slugs.length === 0) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)
        if (visible[0]?.target?.id) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: [0, 1] },
    )
    slugs.forEach((slug) => {
      const el = document.getElementById(slug)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [slugs])

  return active
}

export default function DocumentationPage() {
  const [search, setSearch] = useState('')
  const headings = useMemo(() => extractMarkdownHeadings(documentationSource), [])
  const toc = useMemo(() => buildToc(headings), [headings])
  const slugs = useMemo(() => toc.map((item) => item.slug), [toc])
  const activeSlug = useActiveSection(slugs)

  const filteredToc = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return toc
    return toc.filter((item) => item.text.toLowerCase().includes(term))
  }, [toc, search])

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)]">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Documentação
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Navegue pelas seções ou pesquise um tópico.
              </p>
            </div>
            <Input
              type="search"
              placeholder="Buscar seção..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <nav className="-mx-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
              <ul className="space-y-0.5 text-sm">
                {filteredToc.length === 0 ? (
                  <li className="px-2 py-1 text-xs text-muted-foreground">
                    Nenhuma seção encontrada.
                  </li>
                ) : (
                  filteredToc.map((item) => (
                    <li key={item.slug}>
                      <a
                        href={`#${item.slug}`}
                        onClick={(event) => {
                          event.preventDefault()
                          const el = document.getElementById(item.slug)
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            window.history.replaceState(null, '', `#${item.slug}`)
                          }
                        }}
                        className={cn(
                          'block rounded-md px-2 py-1.5 transition-colors',
                          item.indent ? 'pl-5 text-xs text-muted-foreground' : 'font-medium',
                          activeSlug === item.slug
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted',
                        )}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </nav>
          </CardContent>
        </Card>
      </aside>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="px-6 py-6 sm:px-10 sm:py-10">
          <MarkdownRenderer source={documentationSource} />
        </CardContent>
      </Card>
    </div>
  )
}
