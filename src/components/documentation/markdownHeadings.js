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

export function extractMarkdownHeadings(source) {
  const lines = String(source ?? '').split(/\r?\n/)
  const headings = []
  let inFence = false
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (!match) continue
    const level = match[1].length
    const text = match[2].replace(/\s+#*\s*$/, '').trim()
    const slug = slugify(text) || `heading-${headings.length + 1}`
    headings.push({ level, text, slug })
  }
  return headings
}
