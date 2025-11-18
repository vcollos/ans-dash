#!/usr/bin/env bash
set -euo pipefail

SOURCE_PATH="${SOURCE_PATH:-public/data/20251213_contas_ans.parquet}"
OUTPUT_PATH="${OUTPUT_PATH:-public/data/indicadores.csv}"
LEGACY_OUTPUT_PATH="${LEGACY_OUTPUT_PATH:-}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-csv}"

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "[export] Arquivo fonte não encontrado: $SOURCE_PATH" >&2
  exit 1
fi

python3 scripts/build_curated_dataset.py --source "$SOURCE_PATH" --output "$OUTPUT_PATH" --format "$OUTPUT_FORMAT"

if [[ -n "$LEGACY_OUTPUT_PATH" && "$LEGACY_OUTPUT_PATH" != "$OUTPUT_PATH" ]]; then
  cp "$OUTPUT_PATH" "$LEGACY_OUTPUT_PATH"
  echo "[export] Cópia adicional gerada em $LEGACY_OUTPUT_PATH"
fi

echo "[export] Dataset atualizado em $OUTPUT_PATH a partir de $SOURCE_PATH"
