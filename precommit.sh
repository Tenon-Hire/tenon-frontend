#!/usr/bin/env bash
set -euo pipefail

echo "Running lint..."
npm run lint

echo "Running tests..."
npm test

echo "Building frontend..."
npm run build

echo "precommit checks passed."
