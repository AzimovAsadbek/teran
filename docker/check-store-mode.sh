#!/usr/bin/env bash
# Exercise the same environment validation used before a deployment.
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=deploy.sh
source "$root/deploy.sh"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
ENV_FILE="$scratch/fixture"
for pair in 'false false' 'true true' 'false true' 'true false'; do
  read -r prices checkout <<< "$pair"
  cat > "$ENV_FILE" <<EOF
PUBLIC_ORIGIN=https://localhost
POSTGRES_PASSWORD=local-test-only-password
APP_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
INTERNAL_API_KEY=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
REVALIDATE_SECRET=cccccccccccccccccccccccccccccccc
SHOW_PRICES=$prices
CHECKOUT_ENABLED=$checkout
EOF
  chmod 600 "$ENV_FILE"
  if (validate_env) > "$scratch/result" 2>&1; then
    [ "$prices" = "$checkout" ] || exit 1
  else
    [ "$prices" != "$checkout" ] && grep -q 'SHOW_PRICES va CHECKOUT_ENABLED' "$scratch/result" || { cat "$scratch/result"; exit 1; }
  fi
done
