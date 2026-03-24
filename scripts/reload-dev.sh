#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENV_FILE="${ROOT_DIR}/.env.local.server"
CLIENT_ENV_FILE="${ROOT_DIR}/.env.local"

if [[ -f "${SERVER_ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  . "${SERVER_ENV_FILE}"
fi

if [[ -f "${CLIENT_ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  . "${CLIENT_ENV_FILE}"
fi

: "${SERVER_PORT:=4000}"
: "${VITE_PORT:=5173}"
PORTS="${PORTS:-${VITE_PORT} 5174 ${SERVER_PORT}}"

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
