#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../../.."
pnpm --filter @oxytype/backend db:migrate:remote
pnpm --filter @oxytype/backend deploy:worker
