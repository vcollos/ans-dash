import { useMemo } from 'react'
import { cn } from '../../lib/utils'

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function renderInline(text, keyPrefix = 'i') {
  const tokens = []
  let remaining = text ?? ''
  let index = 0

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      tokens.push(
        <code
          key={`${keyPrefix}-c-${index++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {codeMatch[1]}
        </code>,
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      tokens.push(
        <strong key={`${keyPrefix}-b-${index++}`} className="font-semibold text-foreground">
          {renderInline(boldMatch[1], `${keyPrefix}-b${index}`)}
        </strong>,
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }
    const italicMatch = remaining.match(/^_([^_\n]+)_/)
    if (italicMatch) {
      tokens.push(
        <em key={`${keyPrefix}-i-${index++}`} className="italic">
          {renderInline(italicMatch[1], `${keyPrefix}-i${index}`)}
        </em>,
      )
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const href = linkMatch[2]
      const isExternal = /^https?:/i.test(href)
      tokens.push(
        <a
          key={`${keyPrefix}-l-${index++}`}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer noopener' : undefined}
          className="text-primary underline-offset-4 hover:underline"
        >
          {linkMatch[1]}
        </a>,
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }
    const urlMatch = remaining.match(/^<(https?:\/\/[^>\s]+)>/)
    if (urlMatch) {
      tokens.push(
        <a
          key={`${keyPrefix}-u-${index++}`}
          href={urlMatch[1]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline-offset-4 hover:underline"
        >
          {urlMatch[1]}
        </a>,
      )
      remaining = remaining.slice(urlMatch[0].length)
      continue
    }
    const nextSpecial = remaining.search(/[`*_[<]/)
    if (nextSpecial === -1) {
      tokens.push(remaining)
      remaining = ''
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0])
      remaining = remaining.slice(1)
    } else {
      tokens.push(remaining.slice(0, nextSpecial))
      remaining = remaining.slice(nextSpecial)
    }
  }

  return tokens
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function parseMarkdown(source) {
  const lines = String(source ?? '').split(/\r?\n/)
  const blocks = []
  const headings = []
  let i = 0

  const pushHeading = (level, text) => {
    const slug = slugify(text) || `heading-${headings.length + 1}`
    headings.push({ level, text, slug })
    return slug
  }

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    // Fenced code blocks
    const fenceMatch = line.match(/^```(\w+)?\s*$/)
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? ''
      const code = []
      i += 1
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: 'code', lang, content: code.join('\n') })
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].replace(/\s+#*\s*$/, '').trim()
      const slug = pushHeading(level, text)
      blocks.push({ type: 'heading', level, text, slug })
      i += 1
      continue
    }

    // Horizontal rule
    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buffer = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buffer.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'quote', text: buffer.join(' ') })
      continue
    }

    // Tables
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]))
        i += 1
      }
      blocks.push({ type: 'table', header, rows })
      continue
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Paragraph (até linha em branco ou outro bloco)
    const paragraph = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^-{3,}\s*$/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }

  return { blocks, headings }
}

const headingClass = {
  1: 'mt-12 mb-6 text-3xl font-bold tracking-tight text-foreground first:mt-0',
  2: 'mt-12 mb-4 border-b border-border/60 pb-2 text-2xl font-semibold tracking-tight text-foreground',
  3: 'mt-8 mb-3 text-xl font-semibold text-foreground',
  4: 'mt-6 mb-2 text-lg font-semibold text-foreground',
  5: 'mt-4 mb-2 text-base font-semibold text-foreground',
  6: 'mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground',
}

function renderBlock(block, key) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}`
      return (
        <Tag
          key={key}
          id={block.slug}
          className={cn('scroll-mt-24', headingClass[block.level] ?? headingClass[6])}
        >
          {renderInline(block.text, key)}
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p key={key} className="my-4 leading-7 text-foreground/90">
          {renderInline(block.text, key)}
        </p>
      )
    case 'hr':
      return <hr key={key} className="my-10 border-border/60" />
    case 'quote':
      return (
        <blockquote
          key={key}
          className="my-6 border-l-4 border-primary/40 bg-muted/40 px-4 py-3 italic text-muted-foreground"
        >
          {renderInline(block.text, key)}
        </blockquote>
      )
    case 'ul':
      return (
        <ul key={key} className="my-4 list-disc space-y-1.5 pl-6 text-foreground/90">
          {block.items.map((item, idx) => (
            <li key={`${key}-li-${idx}`} className="leading-7">
              {renderInline(item, `${key}-${idx}`)}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="my-4 list-decimal space-y-1.5 pl-6 text-foreground/90">
          {block.items.map((item, idx) => (
            <li key={`${key}-li-${idx}`} className="leading-7">
              {renderInline(item, `${key}-${idx}`)}
            </li>
          ))}
        </ol>
      )
    case 'code':
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-4 text-xs leading-6"
        >
          <code className={cn('font-mono text-foreground', block.lang ? `language-${block.lang}` : null)}>
            {block.content}
          </code>
        </pre>
      )
    case 'table':
      return (
        <div key={key} className="my-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/50">
              <tr>
                {block.header.map((cell, idx) => (
                  <th
                    key={`${key}-th-${idx}`}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {renderInline(cell, `${key}-th-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {block.rows.map((row, rIdx) => (
                <tr key={`${key}-tr-${rIdx}`} className="even:bg-muted/20">
                  {row.map((cell, cIdx) => (
                    <td
                      key={`${key}-td-${rIdx}-${cIdx}`}
                      className="px-3 py-2 align-top text-foreground/90"
                    >
                      {renderInline(cell, `${key}-td-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

export default function MarkdownRenderer({ source, className }) {
  const { blocks } = useMemo(() => parseMarkdown(source), [source])
  return (
    <article className={cn('max-w-none text-[15px] text-foreground/90', className)}>
      {blocks.map((block, idx) => renderBlock(block, `b-${idx}`))}
    </article>
  )
}
