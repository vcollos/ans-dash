#!/usr/bin/env bash
set -euo pipefail
trap 'kill 0' SIGINT SIGTERM EXIT
npm run dev:server &
SERVER_PID=$!
npm run dev:client &
CLIENT_PID=$!
wait -n $SERVER_PID $CLIENT_PID
EXIT_CODE=$?
kill 0 2>/dev/null || true
wait || true
exit $EXIT_CODE
