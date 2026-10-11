#!/bin/sh
set -eu

lock_marker="node_modules/.wedding-grace-package-lock.json"

if [ ! -f "$lock_marker" ] || ! cmp -s package-lock.json "$lock_marker"; then
  echo "Instalando dependências no volume Docker..."
  npm ci
  cp package-lock.json "$lock_marker"
fi

exec npm run dev -- --hostname 0.0.0.0
