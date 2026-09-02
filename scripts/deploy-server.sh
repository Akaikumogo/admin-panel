#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PM2_APP="${PM2_APP_NAME:-elektro-learn-admin}"

echo "==> ElektroLearn admin deploy: $ROOT"

if [ ! -d node_modules ]; then
  npm ci
else
  npm ci
fi

npm run build

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP" --update-env
  else
    echo "PM2 app '$PM2_APP' topilmadi. Birinchi marta qo'lda pm2 start qiling."
    exit 1
  fi
  pm2 save
else
  echo "PM2 yo'q — dist/ tayyor, serverni qo'lda restart qiling."
fi

echo "Deploy yakunlandi."
