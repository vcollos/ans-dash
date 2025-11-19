#!/usr/bin/env bash
set -euo pipefail

# Executa o mesmo comando do desenvolvimento local, que já realiza
# o bootstrap do Vite e da API Express via `concurrently`.
exec npm run dev
