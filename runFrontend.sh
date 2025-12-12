#!/usr/bin/env bash
set -euo pipefail

export BACKEND_BASE_URL="${BACKEND_BASE_URL:-http://localhost:8000}"

echo "Using BACKEND_BASE_URL=${BACKEND_BASE_URL}"
npm run dev
