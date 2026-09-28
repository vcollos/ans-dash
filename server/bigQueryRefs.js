export function parseBigQueryTableRef(rawValue, defaultDataset, projectId) {
  const normalized = String(rawValue ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
  if (!normalized) {
    throw new Error('Referencia de tabela/view vazia.')
  }
  const parts = normalized.split('.').filter(Boolean)
  if (parts.length === 1) {
    return {
      projectId: projectId,
      datasetId: defaultDataset,
      objectId: parts[0],
      fqn: `${projectId}.${defaultDataset}.${parts[0]}`,
    }
  }
  if (parts.length === 2) {
    return {
      projectId: projectId,
      datasetId: parts[0],
      objectId: parts[1],
      fqn: `${projectId}.${parts[0]}.${parts[1]}`,
    }
  }
  return {
    projectId: parts[0],
    datasetId: parts[1],
    objectId: parts[2],
    fqn: `${parts[0]}.${parts[1]}.${parts[2]}`,
  }
}

