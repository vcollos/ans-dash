#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS="${PORTS:-5173 5174 4000}"

kill_port() {
  local port="$1"
  local pids=""
  pids="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi
  echo "[reload-dev] fechando porta ${port} (pids: ${pids})"
  kill ${pids} 2>/dev/null || true
  sleep 1
  local still=""
  still="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
  if [[ -n "${still}" ]]; then
    echo "[reload-dev] forcando kill na porta ${port} (pids: ${still})"
    kill -9 ${still} 2>/dev/null || true
  fi
}

for port in ${PORTS}; do
  kill_port "${port}"
done

cd "${ROOT_DIR}"
npm run dev:local
