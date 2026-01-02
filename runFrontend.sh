#!/usr/bin/env bash
set -euo pipefail

export TENON_BACKEND_BASE_URL="${TENON_BACKEND_BASE_URL:-http://localhost:8000}"

echo "Using TENON_BACKEND_BASE_URL=${TENON_BACKEND_BASE_URL}"
npm run dev
