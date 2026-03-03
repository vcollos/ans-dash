#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [[ -f "${target_file}" ]]; then
    echo "[init-local-env] mantido: ${target_file}"
    return 0
  fi

  cp "${source_file}" "${target_file}"
  echo "[init-local-env] criado: ${target_file}"
}

copy_if_missing "${ROOT_DIR}/env/.env.local.example" "${ROOT_DIR}/.env.local"
copy_if_missing "${ROOT_DIR}/env/.env.local.server.example" "${ROOT_DIR}/.env.local.server"

echo "[init-local-env] revise os arquivos .env.* e ajuste os valores antes de iniciar."
