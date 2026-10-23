#!/usr/bin/env bash
#
# TERAN deploy: the first installation and every later update of the production stack
# (docker-compose.prod.yml) on this server, behind the server's own Nginx.
#
#   ./deploy.sh                      first run: asks for the two host ports, then installs;
#                                    every later run: updates the same deployment, no questions
#   ./deploy.sh --status             shows what is running; changes nothing
#   ./deploy.sh --reconfigure-ports  chooses other host ports and recreates the two containers
#   ./deploy.sh --help               every option
#
# It never writes, enables or reloads Nginx configuration and never touches TLS, DNS or the
# firewall: the storefront and the API are published on 127.0.0.1 only, at the ports saved in
# .deploy.env, and the server's Nginx administrator points the site there. It never deletes Docker
# volumes, other projects' containers or images, or data; never seeds or resets the database;
# never prints secrets. Documentation: docs/deployment/production.md, "Deploy script".

set -Eeuo pipefail

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/.env.production"
ENV_EXAMPLE="$REPO_ROOT/docker/production.env.example"
DEPLOY_FILE="$REPO_ROOT/.deploy.env"
LOCK_DIR="$REPO_ROOT/.deploy.lock"

DEFAULT_PROJECT="teran-production"
DEFAULT_WEB_PORT=4030
DEFAULT_API_PORT=4031
# The ports the applications listen on inside their containers (apps/web/Dockerfile,
# apps/api/Dockerfile). Only the host side of the mapping is configurable.
WEB_CONTAINER_PORT=3000
API_CONTAINER_PORT=4000
COMPOSE_MIN_MAJOR=2
COMPOSE_MIN_MINOR=24
COMPOSE_SERVICES="postgres migrate api web"
# Read only, to suggest ports and warn about mismatches; nothing there is ever written.
NGINX_DIRS="${TERAN_NGINX_DIRS:-/etc/nginx/projects-enabled /etc/nginx/projects /etc/nginx/sites-enabled /etc/nginx/conf.d}"
HEALTH_TIMEOUT="${TERAN_HEALTH_TIMEOUT:-300}"

ACTION="deploy"
MODE=""
NO_PULL=0
FRESH_DATABASE=0
ASSUME_YES=0
CLI_WEB_PORT=""
CLI_API_PORT=""
PROJECT=""
WEB_PORT=""
API_PORT=""
BACKUP_DIR=""
DEPLOY_BRANCH=""
SAVED_VERSION=""
SAVED_PREVIOUS_VERSION=""
SAVED_MEDIA_STORE=""
SAVED_DEPLOYED_AT=""
NEW_VERSION=""
MEDIA_STORE="volume"
EXISTING_VOLUME=0
HAS_SCHEMA=0
STAGE="start"
LOCK_HELD=0
PARTIAL_BACKUP=""
PENDING_TEMP=""
BACKUP_FILE=""
MIGRATION_SUMMARY=""
REPLY_PORT=""
HTTP_CODE=""
HTTP_BODY=""
HTTP_TOOL=""
CODE_UPDATED=0
FIRST_SUCCESS=0
MIGRATE_LOG=""
FAILED_MIGRATION=""
HEALTH_STATE=""
HEALTH_WAITED=0
ORIGINAL_ARGS=("$@")

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
  C_BOLD=$'\033[1m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_RED=$'\033[31m' C_RESET=$'\033[0m'
else
  C_BOLD="" C_GREEN="" C_YELLOW="" C_RED="" C_RESET=""
fi

# ── Messages ───────────────────────────────────────────────────────────────────────────────────

say() { printf '%s\n' "$*"; }
step() { printf '\n%s==> %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }
ok() { printf '%s[ok]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[!] %s%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }
fail() { printf '%s[x] %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }

die() {
  fail "$*"
  recovery_hint
  exit 1
}

# The manual Compose command for this deployment (run from the repository root).
compose_hint() {
  printf 'docker compose -p %s -f docker-compose.prod.yml --env-file .env.production --env-file .deploy.env' "$PROJECT"
}

recovery_hint() {
  if [ "$CODE_UPDATED" = 1 ]; then
    say "Eslatma: git kodi yangilandi, lekin ishlab turgan konteynerlar avvalgi versiyada qoldi."
  fi
  case "$STAGE" in
    start | prereq | settings | env | ports | config | git | media)
      say "Hech narsa o'zgartirilmadi: konteynerlar, ma'lumotlar va sozlamalar avvalgidek." ;;
    build)
      say "Image'lar yig'ilmadi. Ishlab turgan TERAN konteynerlariga tegilmadi."
      say "Xatoni tuzatib, ./deploy.sh ni qayta ishga tushiring." ;;
    database)
      say "PostgreSQL tayyor bo'lmadi. Ma'lumotlar volume'iga tegilmadi."
      say "Loglar: cd $REPO_ROOT && $(compose_hint) logs postgres" ;;
    backup)
      say "Zaxira olinmadi, shuning uchun migratsiya bajarilmadi; API va frontend avvalgidek ishlayapti."
      say "Diskdagi joyni va $BACKUP_DIR papkasi huquqlarini tekshirib, ./deploy.sh ni qayta ishga tushiring." ;;
    migrate)
      say "Migratsiya muvaffaqiyatsiz. API va frontend yangilanmadi: avvalgi versiya ishlab turibdi."
      if [ -n "$BACKUP_FILE" ]; then say "Migratsiyadan oldingi zaxira: $BACKUP_FILE"; fi
      say "Prisma xabarini o'qing va migratsiyani kodda tuzating. Yiqilgan migratsiya bazada 'failed' bo'lib"
      say "qoladi (P3018; keyingi urinishda P3009). Uning qisman o'zgarish qoldirmaganini tekshirib, belgilang:"
      say "  cd $REPO_ROOT && $(compose_hint) run --rm migrate prisma migrate resolve --rolled-back ${FAILED_MIGRATION:-<migratsiya_nomi>}"
      say "so'ng tuzatilgan kodni push qilib, ./deploy.sh ni qayta ishga tushiring. Bazani zaxiradan tiklash"
      say "avtomatik qilinmaydi: bu ongli qaror (docs/deployment/production.md, 'Backups and restore')." ;;
    ports_late)
      say "Baza migratsiya qilindi${BACKUP_FILE:+ (oldin zaxiralandi: $BACKUP_FILE)}, lekin API va frontend qayta"
      say "yaratilmadi: avvalgi versiya ishlab turibdi. Portni bo'shating yoki ./deploy.sh --reconfigure-ports." ;;
    api | web | smoke)
      say "Yangi konteyner sog'lom holatga kelmadi; loglar yuqorida."
      if [ -n "$SAVED_VERSION" ] && [ -n "$SAVED_DEPLOYED_AT" ]; then
        say "Oxirgi muvaffaqiyatli versiyaga ($SAVED_VERSION) qaytish (image'lar serverda saqlangan):"
        say "  cd $REPO_ROOT && $(compose_hint) up -d --no-build --no-deps api web"
      fi
      say "Ma'lumotlar, volume'lar va .deploy.env o'zgarmadi. Sababni tuzatib, ./deploy.sh ni qayta ishga tushiring." ;;
    *) ;;
  esac
}

on_error() {
  local status="$1" line="$2" command="$3"
  # Inside $(...) a non-zero status is an answer for the caller, which handles it (or fails
  # itself and comes back here at the top level).
  if [ "${BASH_SUBSHELL:-0}" -gt 0 ]; then return "$status"; fi
  trap - ERR
  fail "Kutilmagan xato (deploy.sh, ${line}-qator, kod ${status}): ${command}"
  recovery_hint
  exit "$status"
}

on_interrupt() {
  local how="Ctrl+C"
  [ "${1:-INT}" = "INT" ] || how="$1 signali"
  trap - INT TERM
  printf '\n' >&2
  warn "To'xtatildi ($how). Hech narsa o'chirilmadi; .deploy.env, volume'lar va ma'lumotlar joyida."
  warn "Holatni ko'rish: ./deploy.sh --status"
  exit 130
}

on_exit() {
  if [ -n "$PARTIAL_BACKUP" ]; then rm -f "$PARTIAL_BACKUP"; fi
  if [ -n "$MIGRATE_LOG" ]; then rm -f "$MIGRATE_LOG"; fi
  if [ -n "$PENDING_TEMP" ]; then rm -f "$PENDING_TEMP"; fi
  release_lock
}

# ── Small helpers ──────────────────────────────────────────────────────────────────────────────

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

# The value of KEY in an env file (the last assignment wins, as in Compose), without quotes or an
# inline comment. Prints nothing when the key is absent. Never echoes values to the terminal.
file_value() {
  local file="$1" key="$2" line value="" found=0
  [ -r "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    case "$line" in
      "$key="*)
        value="${line#"$key="}"
        found=1
        ;;
    esac
  done <"$file"
  [ "$found" = 1 ] || return 0
  case "$value" in
    \"*\") value="${value#\"}" && value="${value%\"}" ;;
    \'*\') value="${value#\'}" && value="${value%\'}" ;;
    *)
      value="${value%%[[:space:]]#*}"
      value="$(trim "$value")"
      ;;
  esac
  printf '%s' "$value"
}

env_value() { file_value "$ENV_FILE" "$1"; }

media_label() {
  if [ "$MEDIA_STORE" = "r2" ]; then
    printf 'Cloudflare R2'
  else
    printf "volume %s_uploads" "${PROJECT:-$DEFAULT_PROJECT}"
  fi
}

valid_port() {
  case "$1" in '' | *[!0-9]*) return 1 ;; esac
  [ "${#1}" -le 5 ] || return 1
  [ "$((10#$1))" -ge 1024 ] && [ "$((10#$1))" -le 65535 ]
}

version_at_least() {
  local version="$1" major minor
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"
  case "$major$minor" in '' | *[!0-9]*) return 1 ;; esac
  [ "$major" -gt "$2" ] || { [ "$major" -eq "$2" ] && [ "$minor" -ge "$3" ]; }
}

canonical_dir() {
  if [ -n "$1" ] && [ -d "$1" ]; then (cd -P "$1" && pwd -P); else printf '%s' "$1"; fi
}

file_mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1" 2>/dev/null || printf '?'; }

is_git_checkout() {
  command -v git >/dev/null 2>&1 && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

origin_host() {
  local host
  host="$(env_value PUBLIC_ORIGIN)"
  host="${host#https://}"
  host="${host#http://}"
  host="${host%%/*}"
  printf '%s' "${host%%:*}"
}

confirm() {
  local answer=""
  printf '%s [y/N]: ' "$1" >&2
  IFS= read -r answer || return 1
  case "$(trim "$answer")" in y | Y | yes | YES | ha | Ha | HA) return 0 ;; esac
  return 1
}

cancel() {
  printf '\n' >&2
  warn "$1. Hech narsa o'zgartirilmadi."
  exit 1
}

compose() {
  docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

show_logs() {
  say ""
  say "--- $1: oxirgi loglar ---"
  compose logs --no-color --tail 80 "$1" 2>&1 || true
  say "--- loglar tugadi ---"
}

http_get() {
  local out
  if [ "$HTTP_TOOL" = "curl" ]; then
    out="$(curl -sS --max-time 60 -w '\n%{http_code}' "$1" 2>/dev/null)" || out=$'\n000'
  elif out="$(wget -q -T 60 -O - "$1" 2>/dev/null)"; then
    out="$out"$'\n200'
  else
    out=$'\n000'
  fi
  HTTP_CODE="${out##*$'\n'}"
  HTTP_BODY="${out%$'\n'*}"
}

# ── Lock (one deploy at a time) ────────────────────────────────────────────────────────────────

acquire_lock() {
  local pid=""
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    printf '%s\n' "$$" >"$LOCK_DIR/pid"
    LOCK_HELD=1
    return 0
  fi
  pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [ "$pid" = "$$" ]; then
    LOCK_HELD=1
    return 0
  fi
  if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
    die "Boshqa deploy jarayoni ishlayapti (PID $pid). U tugashini kuting."
  fi
  warn "Tugamay qolgan oldingi deploy'ning qulfi topildi (PID ${pid:-?} ishlamayapti); olib tashlanmoqda."
  rm -f "$LOCK_DIR/pid"
  rmdir "$LOCK_DIR" 2>/dev/null || die "Qulfni olib tashlab bo'lmadi: $LOCK_DIR"
  acquire_lock
}

release_lock() {
  if [ "$LOCK_HELD" = 1 ]; then
    rm -f "$LOCK_DIR/pid"
    rmdir "$LOCK_DIR" 2>/dev/null || true
    LOCK_HELD=0
  fi
}

# ── Prerequisites ──────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
  local server compose_version file
  STAGE="prereq"
  step "Talablar tekshirilmoqda"
  command -v docker >/dev/null 2>&1 ||
    die "Docker topilmadi. Docker Engine va Compose plugin'ini o'rnating (docs/deployment/production.md, §1)."
  if ! server="$(docker info --format '{{.ServerVersion}}' 2>&1)"; then
    case "$server" in
      *ermission*denied*)
        die "Docker'ga kirish huquqi yo'q. Administrator foydalanuvchini 'docker' guruhiga qo'shsin (yoki docker'ga ruxsati bor foydalanuvchi bilan ishga tushiring)." ;;
      *) die "Docker daemon'iga ulanib bo'lmadi: Docker ishlayotganini tekshiring." ;;
    esac
  fi
  ok "Docker $server"
  compose_version="$(docker compose version --short 2>/dev/null || true)"
  compose_version="${compose_version#v}"
  [ -n "$compose_version" ] || die "Docker Compose v2 ('docker compose') topilmadi."
  version_at_least "$compose_version" "$COMPOSE_MIN_MAJOR" "$COMPOSE_MIN_MINOR" ||
    die "Docker Compose $compose_version eski: v${COMPOSE_MIN_MAJOR}.${COMPOSE_MIN_MINOR} yoki yangisi kerak."
  ok "Docker Compose $compose_version"
  if command -v curl >/dev/null 2>&1; then
    HTTP_TOOL="curl"
  elif command -v wget >/dev/null 2>&1; then
    HTTP_TOOL="wget"
  else
    die "curl yoki wget kerak (health check uchun)."
  fi
  if is_git_checkout; then
    ok "Git checkout: $REPO_ROOT"
  else
    warn "Bu papka git checkout emas: yangilashda kod masofadan olinmaydi, joriy fayllar ishlatiladi."
  fi
  for file in "$COMPOSE_FILE" "$REPO_ROOT/apps/api/Dockerfile" "$REPO_ROOT/apps/web/Dockerfile" \
    "$REPO_ROOT/pnpm-lock.yaml" "$ENV_EXAMPLE"; do
    [ -f "$file" ] || die "Kerakli fayl topilmadi: ${file#"$REPO_ROOT"/}"
  done
  ok "Compose fayli, Dockerfile'lar va env shabloni joyida"
  if [ ! -f "$ENV_FILE" ]; then
    fail ".env.production topilmadi ($ENV_FILE)."
    say "Uni shablondan tayyorlang va har bir qiymatni to'ldiring (har bir maxfiy kalit alohida yaratiladi):"
    say "  cp docker/production.env.example .env.production && chmod 600 .env.production"
    say "Batafsil: docs/deployment/production.md, §2. Skript maxfiy qiymatlarni o'zi yaratmaydi."
    say "Hech narsa o'zgartirilmadi."
    exit 1
  fi
}

# ── Settings (.deploy.env) ─────────────────────────────────────────────────────────────────────

valid_project() { [[ "$1" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; }
valid_version() { [ -z "$1" ] || [[ "$1" =~ ^[A-Za-z0-9_.-]{1,128}$ ]]; }
valid_backup_dir() { [[ "$1" =~ ^/[A-Za-z0-9._/@+-]*$ ]]; }

load_settings() {
  STAGE="settings"
  if [ -f "$DEPLOY_FILE" ]; then
    MODE="update"
    PROJECT="$(file_value "$DEPLOY_FILE" TERAN_COMPOSE_PROJECT)"
    WEB_PORT="$(file_value "$DEPLOY_FILE" TERAN_WEB_HOST_PORT)"
    API_PORT="$(file_value "$DEPLOY_FILE" TERAN_API_HOST_PORT)"
    BACKUP_DIR="$(file_value "$DEPLOY_FILE" TERAN_BACKUP_DIR)"
    DEPLOY_BRANCH="$(file_value "$DEPLOY_FILE" TERAN_DEPLOY_BRANCH)"
    SAVED_MEDIA_STORE="$(file_value "$DEPLOY_FILE" TERAN_MEDIA_STORE)"
    SAVED_VERSION="$(file_value "$DEPLOY_FILE" TERAN_VERSION)"
    SAVED_PREVIOUS_VERSION="$(file_value "$DEPLOY_FILE" TERAN_PREVIOUS_VERSION)"
    SAVED_DEPLOYED_AT="$(file_value "$DEPLOY_FILE" TERAN_DEPLOYED_AT)"
    valid_project "$PROJECT" || die ".deploy.env: TERAN_COMPOSE_PROJECT noto'g'ri. Faylni tekshiring (skript uni o'zi tuzatmaydi)."
    if ! { valid_port "$WEB_PORT" && valid_port "$API_PORT"; }; then
      die ".deploy.env: saqlangan portlar noto'g'ri. Tuzatish: ./deploy.sh --reconfigure-ports yoki faylni qo'lda tekshiring."
    fi
    [ "$WEB_PORT" != "$API_PORT" ] || die ".deploy.env: frontend va API portlari bir xil."
    valid_backup_dir "$BACKUP_DIR" || die ".deploy.env: TERAN_BACKUP_DIR mutlaq yo'l bo'lishi kerak."
    if ! { valid_version "$SAVED_VERSION" && valid_version "$SAVED_PREVIOUS_VERSION"; }; then
      die ".deploy.env: TERAN_VERSION qiymati noto'g'ri."
    fi
    case "$SAVED_MEDIA_STORE" in '' | r2 | volume) ;; *) die ".deploy.env: TERAN_MEDIA_STORE r2 yoki volume bo'lishi kerak." ;; esac
    if [ -n "${TERAN_COMPOSE_PROJECT:-}" ] && [ "$TERAN_COMPOSE_PROJECT" != "$PROJECT" ]; then
      die "TERAN_COMPOSE_PROJECT=$TERAN_COMPOSE_PROJECT, lekin bu deploy '$PROJECT' loyihasida. Loyiha almashtirilmaydi."
    fi
    if [ "$ACTION" = "deploy" ] && { [ -n "$CLI_WEB_PORT" ] || [ -n "$CLI_API_PORT" ]; }; then
      die "Portlar allaqachon saqlangan (.deploy.env). Ularni o'zgartirish: ./deploy.sh --reconfigure-ports"
    fi
  else
    [ "$ACTION" != "reconfigure" ] || die "Hali deploy qilinmagan (.deploy.env yo'q). Avval: ./deploy.sh"
    MODE="initial"
    PROJECT="${TERAN_COMPOSE_PROJECT:-$DEFAULT_PROJECT}"
    valid_project "$PROJECT" || die "TERAN_COMPOSE_PROJECT faqat kichik harf, raqam, '-' va '_' dan iborat bo'lishi kerak."
    BACKUP_DIR="${TERAN_BACKUP_DIR:-}"
    if [ -z "$BACKUP_DIR" ]; then
      [ -n "${HOME:-}" ] || die "HOME aniqlanmagan: zaxiralar papkasini TERAN_BACKUP_DIR bilan bering."
      BACKUP_DIR="$HOME/teran-backups/$PROJECT"
    fi
    valid_backup_dir "$BACKUP_DIR" ||
      die "TERAN_BACKUP_DIR mutlaq yo'l bo'lishi va faqat harf, raqam va . _ / @ + - belgilaridan iborat bo'lishi kerak."
    if is_git_checkout; then
      DEPLOY_BRANCH="$(git -C "$REPO_ROOT" symbolic-ref --quiet --short HEAD || true)"
    fi
  fi
  if docker volume inspect "${PROJECT}_postgres-data" >/dev/null 2>&1; then EXISTING_VOLUME=1; fi
}

write_deploy_file() {
  local tmp
  tmp="$(mktemp "$REPO_ROOT/.deploy.env.XXXXXX")"
  PENDING_TEMP="$tmp"
  chmod 600 "$tmp"
  {
    printf '# TERAN deployment settings, written by deploy.sh. No secrets: those stay in .env.production.\n'
    printf "# Change the ports with ./deploy.sh --reconfigure-ports (the server's Nginx must point to them).\n"
    printf 'TERAN_COMPOSE_PROJECT=%s\n' "$PROJECT"
    printf 'TERAN_WEB_HOST_PORT=%s\n' "$WEB_PORT"
    printf 'TERAN_API_HOST_PORT=%s\n' "$API_PORT"
    printf 'TERAN_BACKUP_DIR=%s\n' "$BACKUP_DIR"
    printf 'TERAN_DEPLOY_BRANCH=%s\n' "$DEPLOY_BRANCH"
    printf 'TERAN_MEDIA_STORE=%s\n' "$SAVED_MEDIA_STORE"
    printf 'TERAN_VERSION=%s\n' "$SAVED_VERSION"
    printf 'TERAN_PREVIOUS_VERSION=%s\n' "$SAVED_PREVIOUS_VERSION"
    printf 'TERAN_DEPLOYED_AT=%s\n' "$SAVED_DEPLOYED_AT"
  } >"$tmp"
  mv -f "$tmp" "$DEPLOY_FILE"
  PENDING_TEMP=""
}

# ── Production environment (.env.production) ───────────────────────────────────────────────────

is_placeholder() {
  case "$1" in
    *replace-with* | *change-me* | *changeme* | *CHANGE_ME* | *'<'* | *'>'* | *your-* | *YOUR_* | *example* | *xxxxx* | *TODO*)
      return 0 ;;
  esac
  return 1
}

validate_env() {
  local problems=0 key value mode origin count r2_set name secret other flag gemini
  STAGE="env"
  step "Production sozlamalari tekshirilmoqda (.env.production; qiymatlar ko'rsatilmaydi)"
  mode="$(file_mode "$ENV_FILE")"
  case "$mode" in
    600 | 400 | 640 | 440) ;;
    *) warn ".env.production huquqlari $mode: 'chmod 600 .env.production' tavsiya etiladi (skript faylni o'zgartirmaydi)." ;;
  esac

  for key in PUBLIC_ORIGIN POSTGRES_PASSWORD APP_SECRET INTERNAL_API_KEY REVALIDATE_SECRET; do
    value="$(env_value "$key")"
    if [ -z "$value" ]; then
      fail "$key bo'sh yoki yo'q."
      problems=$((problems + 1))
    elif [ "$key" != "PUBLIC_ORIGIN" ] && is_placeholder "$value"; then
      fail "$key hali shablon qiymatida."
      problems=$((problems + 1))
    fi
  done

  origin="$(env_value PUBLIC_ORIGIN)"
  if [ -n "$origin" ]; then
    if ! [[ "$origin" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
      fail "PUBLIC_ORIGIN https://domen ko'rinishida bo'lishi kerak (yo'l va oxirgi '/' siz)."
      problems=$((problems + 1))
    elif is_placeholder "$origin" || [[ "$origin" == *.invalid* ]]; then
      fail "PUBLIC_ORIGIN hali namuna domeni."
      problems=$((problems + 1))
    elif [[ "$origin" == https://localhost* ]]; then
      warn "PUBLIC_ORIGIN localhost: bu faqat sinov uchun."
    fi
  fi

  for key in APP_SECRET INTERNAL_API_KEY REVALIDATE_SECRET; do
    value="$(env_value "$key")"
    if [ -n "$value" ] && [ "${#value}" -lt 32 ]; then
      fail "$key kamida 32 belgi bo'lishi kerak."
      problems=$((problems + 1))
    fi
  done
  value="$(env_value POSTGRES_PASSWORD)"
  if [ -n "$value" ]; then
    if [ "${#value}" -lt 16 ]; then
      fail "POSTGRES_PASSWORD kamida 16 belgi bo'lishi kerak."
      problems=$((problems + 1))
    elif ! [[ "$value" =~ ^[A-Za-z0-9._~-]+$ ]]; then
      fail "POSTGRES_PASSWORD faqat URL uchun xavfsiz belgilardan iborat bo'lsin (A-Z a-z 0-9 . _ ~ -): u ulanish manzilining ichida."
      problems=$((problems + 1))
    fi
  fi
  for name in APP_SECRET INTERNAL_API_KEY REVALIDATE_SECRET POSTGRES_PASSWORD; do
    secret="$(env_value "$name")"
    [ -n "$secret" ] || continue
    for other in APP_SECRET INTERNAL_API_KEY REVALIDATE_SECRET POSTGRES_PASSWORD; do
      [ "$other" != "$name" ] || break
      if [ "$secret" = "$(env_value "$other")" ]; then
        fail "$name va $other bir xil: har bir maxfiy kalit alohida yaratilishi kerak."
        problems=$((problems + 1))
      fi
    done
  done

  r2_set=0
  for key in R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_PUBLIC_URL; do
    [ -z "$(env_value "$key")" ] || r2_set=$((r2_set + 1))
  done
  if [ "$r2_set" -eq 5 ]; then
    MEDIA_STORE="r2"
    if [[ "$(env_value R2_PUBLIC_URL)" != https://* ]]; then
      fail "R2_PUBLIC_URL https bo'lishi kerak."
      problems=$((problems + 1))
    fi
    for key in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
      if is_placeholder "$(env_value "$key")"; then
        fail "$key hali shablon qiymatida."
        problems=$((problems + 1))
      fi
    done
  elif [ "$r2_set" -gt 0 ]; then
    fail "R2 sozlamalari chala ($r2_set/5): R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET va R2_PUBLIC_URL hammasi yoki hech biri."
    problems=$((problems + 1))
  else
    MEDIA_STORE="volume"
  fi

  case "$(env_value MAIL_TRANSPORT)" in
    '' | disabled) ;;
    smtp)
      if [ -z "$(env_value SMTP_HOST)" ] || [ -z "$(env_value MAIL_FROM)" ]; then
        fail "MAIL_TRANSPORT=smtp uchun SMTP_HOST va MAIL_FROM kerak."
        problems=$((problems + 1))
      fi
      ;;
    log)
      fail "MAIL_TRANSPORT=log production'da ishlamaydi (disabled yoki smtp)."
      problems=$((problems + 1))
      ;;
    *)
      fail "MAIL_TRANSPORT disabled yoki smtp bo'lishi kerak."
      problems=$((problems + 1))
      ;;
  esac

  case "$(env_value PAYMENT_PROVIDER_MODE)" in
    '' | live) ;;
    demo)
      if [ "$(env_value ALLOW_DEMO_PAYMENTS)" != "true" ]; then
        fail "PAYMENT_PROVIDER_MODE=demo production'da faqat ALLOW_DEMO_PAYMENTS=true bilan ishlaydi."
        problems=$((problems + 1))
      fi
      ;;
    *)
      fail "PAYMENT_PROVIDER_MODE live yoki demo bo'lishi kerak."
      problems=$((problems + 1))
      ;;
  esac
  count=0
  for key in PAYME_MERCHANT_ID PAYME_KEY; do
    [ -z "$(env_value "$key")" ] || count=$((count + 1))
  done
  if [ "$count" -eq 1 ]; then
    fail "Payme: PAYME_MERCHANT_ID va PAYME_KEY ikkalasi yoki hech biri."
    problems=$((problems + 1))
  fi
  count=0
  for key in CLICK_SERVICE_ID CLICK_MERCHANT_ID CLICK_SECRET_KEY; do
    [ -z "$(env_value "$key")" ] || count=$((count + 1))
  done
  if [ "$count" -ne 0 ] && [ "$count" -ne 3 ]; then
    fail "Click: CLICK_SERVICE_ID, CLICK_MERCHANT_ID va CLICK_SECRET_KEY hammasi yoki hech biri."
    problems=$((problems + 1))
  fi

  case "$(env_value TELEGRAM_MODE)" in
    '' | disabled | dry-run) ;;
    live)
      if [ -z "$(env_value TELEGRAM_BOT_TOKEN)" ] || [ -z "$(env_value TELEGRAM_CHANNEL_ID)" ]; then
        fail "TELEGRAM_MODE=live uchun TELEGRAM_BOT_TOKEN va TELEGRAM_CHANNEL_ID kerak."
        problems=$((problems + 1))
      fi
      ;;
    *)
      fail "TELEGRAM_MODE disabled, dry-run yoki live bo'lishi kerak."
      problems=$((problems + 1))
      ;;
  esac

  gemini="$(env_value GEMINI_API_KEY)"
  if [ -n "$gemini" ] && { is_placeholder "$gemini" || [ "${#gemini}" -lt 20 ]; }; then
    fail "GEMINI_API_KEY namunaga o'xshaydi yoki juda qisqa (Google AI Studio kalitini kiriting yoki bo'sh qoldiring)."
    problems=$((problems + 1))
  fi

  for flag in DEMO_CONTENT SHOW_PRICES CHECKOUT_ENABLED; do
    case "$(env_value "$flag")" in
      '' | true | false) ;;
      *)
        fail "$flag true yoki false bo'lishi kerak."
        problems=$((problems + 1))
        ;;
    esac
  done
  if [ "$(env_value SHOW_PRICES)" = "true" ]; then flag="true"; else flag="false"; fi
  if [ "$(env_value CHECKOUT_ENABLED)" = "true" ]; then value="true"; else value="false"; fi
  if [ "$flag" != "$value" ]; then
    warn "SHOW_PRICES va CHECKOUT_ENABLED har xil: narxsiz do'kon onlayn buyurtma olmaydi (ADR-027)."
  fi
  value="$(env_value CORS_EXTRA_ORIGINS)"
  if [ -n "$value" ]; then
    local entry
    IFS=',' read -r -a entries <<<"$value"
    for entry in "${entries[@]}"; do
      entry="$(trim "$entry")"
      if [ -n "$entry" ] && [[ "$entry" != https://* ]]; then
        fail "CORS_EXTRA_ORIGINS'dagi har bir manzil https bo'lishi kerak."
        problems=$((problems + 1))
        break
      fi
    done
  fi

  if grep -qi 'neon\.tech' "$ENV_FILE"; then
    warn ".env.production'da Neon manzili bor: u ishlatilmaydi (API serverdagi PostgreSQL konteyneriga ulanadi)."
  fi
  if [ -n "$(env_value DATABASE_URL)" ]; then
    warn "DATABASE_URL e'tiborga olinmaydi: Compose uni POSTGRES_* dan o'zi tuzadi."
  fi
  if [ -n "$(env_value TERAN_WEB_HOST_PORT)$(env_value TERAN_API_HOST_PORT)" ]; then
    warn ".env.production'dagi TERAN_*_HOST_PORT e'tiborga olinmaydi: portlar .deploy.env'dan olinadi."
  fi

  [ "$problems" -eq 0 ] ||
    die "$problems ta muammo topildi. .env.production'ni tuzating (qiymatlar bu yerda ko'rsatilmaydi), keyin qayta ishga tushiring."
  ok "Majburiy qiymatlar to'liq, shablon qiymatlari yo'q; media: $(media_label)"
}

# ── Compose project ────────────────────────────────────────────────────────────────────────────

project_container_ids() {
  docker ps -aq --filter "label=com.docker.compose.project=$PROJECT"
}

service_container() {
  docker ps -aq --filter "label=com.docker.compose.project=$PROJECT" \
    --filter "label=com.docker.compose.service=$1" \
    --filter "label=com.docker.compose.oneoff=False" | awk 'NR == 1'
}

check_project_ownership() {
  local ids id info workdir rest service name orphans=""
  STAGE="config"
  ids="$(project_container_ids)"
  [ -n "$ids" ] || return 0
  for id in $ids; do
    info="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{.Name}}' "$id")"
    workdir="${info%%|*}"
    rest="${info#*|}"
    service="${rest%%|*}"
    name="${rest#*|}"
    name="${name#/}"
    if [ "$(canonical_dir "$workdir")" != "$REPO_ROOT" ]; then
      die "Compose loyihasi '$PROJECT' boshqa papkadan ishga tushirilgan ($workdir). Bu checkout uni boshqarmaydi; boshqa nom bilan ishga tushiring (TERAN_COMPOSE_PROJECT) yoki o'sha papkadan foydalaning."
    fi
    case " $COMPOSE_SERVICES " in
      *" $service "*) ;;
      *) orphans="$orphans $name" ;;
    esac
  done
  if [ -n "$orphans" ]; then
    warn "Loyihada compose faylida yo'q konteynerlar bor:$orphans. Ular o'chirilmaydi; keraksiz bo'lsa qo'lda olib tashlang."
  fi
}

check_compose_config() {
  local services service
  STAGE="config"
  step "Konfiguratsiya tekshirilmoqda (docker compose config)"
  compose config --quiet || die "docker-compose.prod.yml yoki .env.production noto'g'ri (yuqoridagi xabar)."
  services="$(compose config --services)"
  for service in $COMPOSE_SERVICES; do
    grep -qx "$service" <<<"$services" ||
      die "docker-compose.prod.yml'da '$service' xizmati yo'q: bu TERAN compose fayli emasga o'xshaydi."
  done
  ok "Compose fayli to'g'ri; loyiha '$PROJECT', xizmatlar: $COMPOSE_SERVICES"
}

# ── Ports ──────────────────────────────────────────────────────────────────────────────────────

# "name|project|working_dir|service" of the first running container that publishes host port $1.
docker_port_holder() {
  local ids
  ids="$(docker ps -q)"
  [ -n "$ids" ] || return 0
  # shellcheck disable=SC2086 # one argument per container id
  docker inspect --format '{{.Name}}|{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.project.working_dir"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{range $p, $b := .NetworkSettings.Ports}}{{range $b}}{{.HostPort}},{{end}}{{end}}' $ids |
    awk -F'|' -v port="$1" 'found == 0 && index("," $5, "," port ",") { sub(/^\//, "", $1); print $1 "|" $2 "|" $3 "|" $4; found = 1 }'
}

# Status 0 when a process on this host listens on TCP port $1, or accepts connections on it.
host_port_listening() {
  local port="$1" out=""
  if command -v ss >/dev/null 2>&1; then
    out="$(ss -Hltn "sport = :$port" 2>/dev/null || ss -ltn "sport = :$port" 2>/dev/null | awk 'NR > 1')"
    [ -z "$out" ] || return 0
  elif command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then return 0; fi
  fi
  # A listener on 127.0.0.1 or on all addresses (the ones that would conflict) accepts this.
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1; then return 0; fi
  return 1
}

# Prints why port $1 cannot be used for service $2 (status 0), or nothing when it is free or
# already published by this deployment's own container for that service (status 1).
port_busy_reason() {
  local port="$1" service="$2" holder name project workdir holder_service
  holder="$(docker_port_holder "$port")"
  if [ -n "$holder" ]; then
    IFS='|' read -r name project workdir holder_service <<<"$holder"
    if [ "$project" = "$PROJECT" ] && [ "$holder_service" = "$service" ] &&
      [ "$(canonical_dir "$workdir")" = "$REPO_ROOT" ]; then
      return 1
    fi
    printf "Docker konteyneri '%s' ishlatyapti" "$name"
    return 0
  fi
  if host_port_listening "$port"; then
    printf 'serverdagi boshqa jarayon tinglayapti'
    return 0
  fi
  return 1
}

# The host port this deployment's container for service $1 publishes now (empty if none).
current_host_port() {
  local id container_port="$2"
  id="$(service_container "$1")"
  [ -n "$id" ] || return 0
  docker inspect --format "{{range \$p, \$b := .NetworkSettings.Ports}}{{if eq \$p \"$container_port/tcp\"}}{{range \$b}}{{.HostPort}} {{end}}{{end}}{{end}}" "$id" |
    awk '{ print $1 }'
}

# "WEB API" (either may be "-"): the loopback ports the server's Nginx sends this site to, read
# from its configuration where readable. Prints nothing when they cannot be determined.
nginx_upstream_ports() {
  local host="$1" host_re dir file
  local all=() matching=()
  [ -n "$host" ] || return 0
  host_re="$(printf '%s' "$host" | sed 's/[.]/\\./g')"
  for dir in $NGINX_DIRS; do
    [ -d "$dir" ] || continue
    for file in "$dir"/*; do
      if [ ! -f "$file" ] || [ ! -r "$file" ]; then continue; fi
      all+=("$file")
      if grep -Eq "server_name[^;]*([[:space:]]|^)${host_re}([[:space:];]|$)" "$file"; then
        matching+=("$file")
      fi
    done
  done
  [ "${#matching[@]}" -gt 0 ] || return 0
  awk '
    function port_of(target,   t) {
      t = target
      sub(/^http:\/\//, "", t)
      sub(/[\/;].*$/, "", t)
      if (t ~ /^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/) { sub(/^.*:/, "", t); return t }
      if (t in ups) return ups[t]
      return ""
    }
    { line = $0; sub(/#.*/, "", line) }
    pass == 1 {
      rest = line
      if (match(rest, /upstream[ \t]+[^ \t{]+[ \t]*\{/)) {
        name = substr(rest, RSTART, RLENGTH); sub(/^upstream[ \t]+/, "", name); sub(/[ \t]*\{$/, "", name)
        up = name; rest = substr(rest, RSTART + RLENGTH)
      }
      if (up != "") {
        while (match(rest, /(^|[ \t;{])server[ \t]+[^ \t;]+/)) {
          addr = substr(rest, RSTART, RLENGTH); sub(/^.*server[ \t]+/, "", addr)
          if (addr ~ /^(127\.0\.0\.1|localhost|\[::1\]):[0-9]+$/ && !(up in ups)) { sub(/^.*:/, "", addr); ups[up] = addr }
          rest = substr(rest, RSTART + RLENGTH)
        }
        if (rest ~ /\}/) up = ""
      }
      next
    }
    pass == 2 {
      if (line ~ /^[ \t]*location[ \t]/) {
        path = line; sub(/^[ \t]*location[ \t]+/, "", path); sub(/[ \t]*\{.*$/, "", path)
        n = split(path, parts, /[ \t]+/); loc = parts[n]
      }
      if (line ~ /proxy_pass[ \t]+http:\/\//) {
        target = line; sub(/^.*proxy_pass[ \t]+/, "", target)
        p = port_of(target)
        if (p != "") {
          if (loc == "/" && web == "") web = p
          else if ((loc ~ /^\/api/ || loc ~ /api\/v1/ || loc ~ /^\/uploads/) && api == "") api = p
        }
      }
    }
    END { if (web != "" || api != "") print (web == "" ? "-" : web) " " (api == "" ? "-" : api) }
  ' pass=1 "${all[@]}" pass=2 "${matching[@]}" 2>/dev/null || true
}

warn_nginx_mismatch() {
  local detected="$1" nginx_web nginx_api
  [ -n "$detected" ] || return 0
  nginx_web="${detected%% *}"
  nginx_api="${detected##* }"
  if [ "$nginx_web" != "-" ] && [ "$nginx_web" != "$WEB_PORT" ]; then
    warn "Serverdagi Nginx bu sayt sahifalarini 127.0.0.1:$nginx_web ga yuboradi, frontend esa $WEB_PORT da bo'ladi. Nginx'ni administrator moslashi kerak (skript Nginx'ga tegmaydi)."
  fi
  if [ "$nginx_api" != "-" ] && [ "$nginx_api" != "$API_PORT" ]; then
    warn "Serverdagi Nginx /api ni 127.0.0.1:$nginx_api ga yuboradi, API esa $API_PORT da bo'ladi. Nginx'ni administrator moslashi kerak (skript Nginx'ga tegmaydi)."
  fi
}

prompt_port() {
  local label="$1" default="$2" other="$3" service="$4" answer reason
  while :; do
    printf '%s [%s]: ' "$label" "$default" >&2
    if ! IFS= read -r answer; then cancel "Kiritish tugadi"; fi
    answer="$(trim "$answer")"
    [ -n "$answer" ] || answer="$default"
    case "$answer" in q | Q | quit | exit | bekor | cancel) cancel "Bekor qilindi" ;; esac
    if ! valid_port "$answer"; then
      say "Noto'g'ri port: '$answer'. 1024 va 65535 orasidagi butun son kiriting (q: bekor qilish)."
      continue
    fi
    answer="$((10#$answer))"
    if [ "$answer" = "$other" ]; then
      say "Frontend va backend portlari har xil bo'lishi kerak ($answer allaqachon tanlangan). Boshqa port kiriting."
      continue
    fi
    if reason="$(port_busy_reason "$answer" "$service")"; then
      say "Port $answer band ($reason). Boshqa port kiriting."
      continue
    fi
    REPLY_PORT="$answer"
    return 0
  done
}

given_port() {
  local value="$1" label="$2" other="$3" service="$4" reason
  valid_port "$value" || die "$label: '$value' noto'g'ri port (1024-65535)."
  value="$((10#$value))"
  [ "$value" != "$other" ] || die "Frontend va backend portlari har xil bo'lishi kerak."
  if reason="$(port_busy_reason "$value" "$service")"; then die "Port $value band ($reason). Boshqa port bering."; fi
  REPLY_PORT="$value"
}

choose_ports() {
  local detected default_web default_api current
  STAGE="ports"
  detected="$(nginx_upstream_ports "$(origin_host)")"
  if [ -n "$detected" ]; then
    say "Serverdagi Nginx sozlamasida $(origin_host) uchun topilgan upstream portlar (faqat o'qildi): frontend ${detected%% *}, API ${detected##* }."
  fi
  default_web="$DEFAULT_WEB_PORT"
  default_api="$DEFAULT_API_PORT"
  if [ -n "$detected" ]; then
    [ "${detected%% *}" = "-" ] || default_web="${detected%% *}"
    [ "${detected##* }" = "-" ] || default_api="${detected##* }"
  fi
  current="$(current_host_port web "$WEB_CONTAINER_PORT")"
  [ -z "$current" ] || default_web="$current"
  current="$(current_host_port api "$API_CONTAINER_PORT")"
  [ -z "$current" ] || default_api="$current"
  if [ "$ACTION" = "reconfigure" ]; then
    default_web="$WEB_PORT"
    default_api="$API_PORT"
  fi

  if [ -n "$CLI_WEB_PORT" ] || [ -n "$CLI_API_PORT" ]; then
    if [ -z "$CLI_WEB_PORT" ] || [ -z "$CLI_API_PORT" ]; then die "--web-port va --api-port birga beriladi."; fi
    given_port "$CLI_WEB_PORT" "Frontend porti" "" web
    WEB_PORT="$REPLY_PORT"
    given_port "$CLI_API_PORT" "Backend API porti" "$WEB_PORT" api
    API_PORT="$REPLY_PORT"
  else
    say "Konteynerlar faqat 127.0.0.1 da ochiladi; serverdagi Nginx shu portlarga yo'naltiradi."
    prompt_port "Frontend porti (Next.js, konteyner ichida :$WEB_CONTAINER_PORT)" "$default_web" "" web
    WEB_PORT="$REPLY_PORT"
    prompt_port "Backend API porti (NestJS, konteyner ichida :$API_CONTAINER_PORT)" "$default_api" "$WEB_PORT" api
    API_PORT="$REPLY_PORT"
  fi
  ok "Portlar: 127.0.0.1:$WEB_PORT -> web:$WEB_CONTAINER_PORT, 127.0.0.1:$API_PORT -> api:$API_CONTAINER_PORT"
  warn_nginx_mismatch "$detected"
}

check_saved_ports() {
  local reason
  [ "$STAGE" = "ports_late" ] || STAGE="ports"
  if reason="$(port_busy_reason "$WEB_PORT" web)"; then
    die "Saqlangan frontend porti $WEB_PORT endi band ($reason). TERAN konteynerlariga tegilmadi. Portni bo'shating yoki boshqasini tanlang: ./deploy.sh --reconfigure-ports"
  fi
  if reason="$(port_busy_reason "$API_PORT" api)"; then
    die "Saqlangan API porti $API_PORT endi band ($reason). TERAN konteynerlariga tegilmadi. Portni bo'shating yoki boshqasini tanlang: ./deploy.sh --reconfigure-ports"
  fi
}

reconfigure_ports() {
  local old_web="$WEB_PORT" old_api="$API_PORT"
  step "Portlarni qayta sozlash"
  say "Hozirgi portlar: frontend 127.0.0.1:$old_web, API 127.0.0.1:$old_api"
  choose_ports
  if [ "$WEB_PORT" = "$old_web" ] && [ "$API_PORT" = "$old_api" ]; then
    say "Portlar o'zgarmadi. Hech narsa qilinmadi."
    exit 0
  fi
  warn "API va frontend konteynerlari yangi portlarda qayta yaratiladi. Serverdagi Nginx eski portlarga yo'naltirsa, sayt administrator Nginx'ni yangilamaguncha ochilmaydi. Skript Nginx'ga tegmaydi."
  if [ "$ASSUME_YES" != 1 ] && ! confirm "Yangi portlar saqlanib, konteynerlar qayta yaratilsinmi?"; then
    WEB_PORT="$old_web"
    API_PORT="$old_api"
    cancel "Bekor qilindi"
  fi
  write_deploy_file
  ok "Yangi portlar .deploy.env'da saqlandi."
  NO_PULL=1
}

# ── Code (git) ─────────────────────────────────────────────────────────────────────────────────

update_code() {
  local branch upstream remote merge counts ahead behind before after
  STAGE="git"
  step "Kod tekshirilmoqda (git)"
  if [ "${TERAN_DEPLOY_CONTINUED:-}" = 1 ]; then
    CODE_UPDATED=1
    ok "Kod yangilandi; deploy.sh'ning yangi versiyasi davom etmoqda."
    return 0
  fi
  if [ "$NO_PULL" = 1 ]; then
    warn "Git'dan yangilanmadi (--no-pull): joriy lokal kod deploy qilinadi."
    return 0
  fi
  if ! is_git_checkout; then
    warn "Git checkout emas: joriy fayllar deploy qilinadi (masofadan olinmadi)."
    return 0
  fi
  branch="$(git -C "$REPO_ROOT" symbolic-ref --quiet --short HEAD || true)"
  if [ -z "$branch" ]; then
    warn "HEAD hech qaysi branch'da emas (detached): joriy kod deploy qilinadi, yangilanmaydi."
    return 0
  fi
  if [ -n "$DEPLOY_BRANCH" ] && [ "$branch" != "$DEPLOY_BRANCH" ]; then
    die "Bu deploy '$DEPLOY_BRANCH' branch'idan; hozir '$branch' ochiq. Skript branch almashtirmaydi: 'git checkout $DEPLOY_BRANCH' qiling yoki ataylab bo'lsa .deploy.env'dagi TERAN_DEPLOY_BRANCH ni o'zgartiring."
  fi
  upstream="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [ -z "$upstream" ]; then
    warn "'$branch' uchun upstream (kuzatiladigan masofaviy branch) sozlanmagan: joriy lokal kod deploy qilinadi, masofadagi oxirgi kod olinmadi."
    return 0
  fi
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)" ]; then
    fail "Kuzatiladigan fayllarda commit qilinmagan o'zgarishlar bor:"
    git -C "$REPO_ROOT" status --short --untracked-files=no >&2
    die "Yangilash bu o'zgarishlarni bosib ketishi mumkin, shuning uchun to'xtatildi (hech narsa o'chirilmadi). Ularni commit qiling yoki o'zingiz saqlab qo'ying, yoki lokal kodni shundayligicha deploy qilish uchun: ./deploy.sh --no-pull"
  fi
  remote="$(git -C "$REPO_ROOT" config "branch.$branch.remote")"
  merge="$(git -C "$REPO_ROOT" config "branch.$branch.merge")"
  say "Masofadan olinmoqda: $upstream"
  GIT_TERMINAL_PROMPT=0 git -C "$REPO_ROOT" fetch --quiet "$remote" "$merge" ||
    die "git fetch muvaffaqiyatsiz ($upstream). Tarmoq va kirish huquqini tekshiring; kod o'zgartirilmadi."
  counts="$(git -C "$REPO_ROOT" rev-list --left-right --count 'HEAD...@{u}')"
  ahead="${counts%%[[:space:]]*}"
  behind="${counts##*[[:space:]]}"
  if [ "$behind" -gt 0 ] && [ "$ahead" -gt 0 ]; then
    die "'$branch' va $upstream ajralib ketgan (lokal $ahead, masofada $behind yangi commit). Skript avtomatik birlashtirmaydi: buni qo'lda hal qiling."
  fi
  if [ "$behind" -gt 0 ]; then
    before="$(git -C "$REPO_ROOT" hash-object "$REPO_ROOT/deploy.sh")"
    git -C "$REPO_ROOT" merge --ff-only --quiet '@{u}' ||
      die "Fast-forward yangilash bajarilmadi (masalan, kuzatilmaydigan fayl ustiga yozilardi). Kod o'zgartirilmadi; git xabarini o'qing."
    CODE_UPDATED=1
    ok "Kod yangilandi: $behind ta yangi commit ($upstream)."
    after="$(git -C "$REPO_ROOT" hash-object "$REPO_ROOT/deploy.sh")"
    if [ "$before" != "$after" ]; then
      say "deploy.sh o'zi ham yangilandi: yangi versiyasi bilan davom etilmoqda."
      TERAN_DEPLOY_CONTINUED=1 exec "$BASH" "$REPO_ROOT/deploy.sh" --no-pull ${ORIGINAL_ARGS[@]+"${ORIGINAL_ARGS[@]}"}
    fi
  elif [ "$ahead" -gt 0 ]; then
    warn "Lokal '$branch' $upstream dan $ahead commit oldinda: lokal kod deploy qilinadi."
  else
    ok "Kod eng so'nggi holatda ($upstream)."
  fi
}

compute_version() {
  if is_git_checkout; then
    NEW_VERSION="$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)"
    if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
      NEW_VERSION="${NEW_VERSION}-local$(date -u +%Y%m%d%H%M%S)"
      warn "Ishchi daraxtda commit qilinmagan o'zgarishlar bor: ular bilan deploy qilinadi (versiya $NEW_VERSION)."
    fi
  else
    NEW_VERSION="local$(date -u +%Y%m%d%H%M%S)"
  fi
  export TERAN_VERSION="$NEW_VERSION"
}

check_media_store() {
  STAGE="media"
  if [ -n "$SAVED_MEDIA_STORE" ] && [ "$SAVED_MEDIA_STORE" != "$MEDIA_STORE" ]; then
    if [ "$SAVED_MEDIA_STORE" = "r2" ]; then
      die "Oldingi deploy rasm va videolarni Cloudflare R2'da saqlagan, endi .env.production'da R2 sozlamalari yo'q. Mahalliy saqlashga o'tish saytdagi rasmlarni yo'qotadi: R2_* qiymatlarini qaytaring."
    fi
    die "Oldingi deploy fayllarni '${PROJECT}_uploads' volume'ida saqlagan, endi R2 sozlangan. Mavjud fayllar bucket'ga ko'chirilmaguncha saytda ko'rinmaydi. Ko'chirib bo'lgach, .deploy.env'da TERAN_MEDIA_STORE=r2 qiling."
  fi
}

# ── Build, database, migrations ────────────────────────────────────────────────────────────────

build_images() {
  STAGE="build"
  step "Docker image'lari tayyorlanmoqda (versiya $NEW_VERSION)"
  compose build || die "Image'lar yig'ilmadi."
  ok "Image'lar tayyor: teran-api, teran-api-tools, teran-web (:$NEW_VERSION)"
}

wait_healthy() {
  local service="$1" timeout="$2" id status waited=0
  HEALTH_STATE="missing"
  HEALTH_WAITED=0
  id="$(service_container "$service")"
  [ -n "$id" ] || return 1
  while :; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}nohealthcheck-{{.State.Status}}{{end}}' "$id" 2>/dev/null || printf 'missing')"
    HEALTH_STATE="${status#nohealthcheck-}"
    HEALTH_WAITED="$waited"
    case "$status" in
      healthy | nohealthcheck-running) return 0 ;;
      unhealthy | missing | nohealthcheck-exited | nohealthcheck-dead) return 1 ;;
    esac
    [ "$waited" -lt "$timeout" ] || return 1
    sleep 3
    waited=$((waited + 3))
  done
}

# SQL from stdin, run by psql inside the postgres container as its own user (the container's
# POSTGRES_USER and POSTGRES_DB, expanded there: no credentials pass through this script).
db_query() {
  # shellcheck disable=SC2016 # expanded inside the container
  compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -XAtq -v ON_ERROR_STOP=1'
}

start_postgres() {
  STAGE="database"
  step "Ma'lumotlar bazasi tayyorligi tekshirilmoqda"
  compose up -d --no-build --no-deps postgres || die "PostgreSQL konteynerini ishga tushirib bo'lmadi."
  if ! wait_healthy postgres 180; then
    show_logs postgres
    die "PostgreSQL sog'lom holatga kelmadi (holat: $HEALTH_STATE)."
  fi
  ok "PostgreSQL tayyor (ichki tarmoqda, tashqariga ochilmagan; volume: ${PROJECT}_postgres-data)"
}

inspect_database() {
  local has
  STAGE="database"
  has="$(printf '%s\n' "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" | db_query)" ||
    die "Bazaga so'rov yuborib bo'lmadi."
  if [ "$has" = "t" ]; then
    HAS_SCHEMA=1
    ok "Mavjud ma'lumotlar bazasi topildi (migratsiyalar tarixi bor)."
    return 0
  fi
  HAS_SCHEMA=0
  if [ "$FRESH_DATABASE" = 1 ]; then
    warn "Baza bo'sh: --fresh-database berilgan, yangi bo'sh do'kon sxemasi yaratiladi."
    return 0
  fi
  if [ "$MODE" = "update" ]; then
    fail "Ma'lumotlar bazasi bo'sh, lekin bu yangilash."
    say "Jonli do'konni ko'chirayotgan bo'lsangiz, avval ma'lumotni tiklang: docs/deployment/migration-from-vercel.md"
    say "Ataylab yangi bo'sh do'kon bo'lsa: ./deploy.sh --fresh-database"
    say "API va frontend ishga tushirilmadi; PostgreSQL ishlab turibdi; hech narsa o'chirilmadi."
    remember_built_images
    exit 2
  fi
  say "Ma'lumotlar bazasi bo'sh (yangi o'rnatish)."
  say "Agar bu jonli do'konni ko'chirish bo'lsa, avval Neon'dagi ma'lumotni tiklang: docs/deployment/migration-from-vercel.md"
  if confirm "Bo'sh baza bilan yangi do'kon sifatida davom etilsinmi?"; then
    return 0
  fi
  say "To'xtatildi. PostgreSQL ishlab turibdi, portlar .deploy.env'da saqlandi."
  say "Ma'lumotni tiklagach ./deploy.sh ni qayta ishga tushiring (savollarsiz davom etadi)."
  remember_built_images
  exit 2
}

backup_database() {
  local stamp file size_bytes avail_kb list tables
  STAGE="backup"
  step "Migratsiyadan oldin zaxira olinmoqda"
  if [ ! -d "$BACKUP_DIR" ]; then
    (umask 077 && mkdir -p "$BACKUP_DIR") || die "Zaxiralar papkasini yaratib bo'lmadi: $BACKUP_DIR"
  fi
  [ -w "$BACKUP_DIR" ] || die "Zaxiralar papkasiga yozib bo'lmaydi: $BACKUP_DIR"
  size_bytes="$(printf '%s\n' 'SELECT pg_database_size(current_database());' | db_query)" ||
    die "Baza hajmini aniqlab bo'lmadi."
  avail_kb="$(df -Pk "$BACKUP_DIR" | awk 'NR == 2 { print $4 }')"
  if [ -n "$avail_kb" ] && [ "$((avail_kb * 1024))" -lt "$size_bytes" ]; then
    die "Zaxira uchun joy yetmaydi: $BACKUP_DIR da $((avail_kb / 1024)) MB bo'sh, baza $((size_bytes / 1048576)) MB."
  fi
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  file="$BACKUP_DIR/${PROJECT}-${stamp}-before-${NEW_VERSION}.dump"
  PARTIAL_BACKUP="$file.partial"
  # shellcheck disable=SC2016 # expanded inside the container
  (umask 077 && compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' >"$PARTIAL_BACKUP") ||
    die "pg_dump muvaffaqiyatsiz."
  [ -s "$PARTIAL_BACKUP" ] || die "Zaxira fayli bo'sh chiqdi."
  list="$(compose exec -T postgres pg_restore --list <"$PARTIAL_BACKUP")" ||
    die "Zaxirani o'qib bo'lmadi (pg_restore --list)."
  tables="$(printf '%s\n' "$list" | grep -c ' TABLE DATA ' || true)"
  grep -q '_prisma_migrations' <<<"$list" || die "Zaxirada migratsiyalar jadvali yo'q: zaxira to'liq emas."
  mv -f "$PARTIAL_BACKUP" "$file"
  PARTIAL_BACKUP=""
  chmod 600 "$file"
  BACKUP_FILE="$file"
  ok "Zaxira: $file ($(($(wc -c <"$file") / 1024)) KB, $tables ta jadval ma'lumoti; tekshirildi)"
}

run_migrations() {
  local status_output
  STAGE="migrate"
  step "Migratsiyalar bajarilmoqda (prisma migrate deploy)"
  MIGRATE_LOG="$(mktemp "${TMPDIR:-/tmp}/teran-migrate.XXXXXX")"
  if ! compose run --rm -T --no-deps migrate 2>&1 | tee "$MIGRATE_LOG"; then
    FAILED_MIGRATION="$(sed -n 's/^Migration name: //p' "$MIGRATE_LOG" | awk 'END { print }')"
    die "Migratsiya muvaffaqiyatsiz${FAILED_MIGRATION:+ ($FAILED_MIGRATION)}."
  fi
  status_output="$(compose run --rm -T --no-deps migrate prisma migrate status 2>&1)" || true
  if grep -q 'Database schema is up to date' <<<"$status_output"; then
    MIGRATION_SUMMARY="sxema eng so'nggi holatda"
  else
    printf '%s\n' "$status_output" >&2
    die "Migratsiyalardan keyin ham sxema to'liq emas (prisma migrate status)."
  fi
  ok "Migratsiyalar: $MIGRATION_SUMMARY"
}

start_service() {
  local service="$1" label="$2"
  STAGE="$service"
  compose up -d --no-build --no-deps "$service" || die "$label konteynerini ishga tushirib bo'lmadi."
  if ! wait_healthy "$service" "$HEALTH_TIMEOUT"; then
    show_logs "$service"
    die "$label sog'lom holatga kelmadi (holat: $HEALTH_STATE, ${HEALTH_WAITED} soniyadan keyin; chegara $HEALTH_TIMEOUT soniya)."
  fi
  ok "$label sog'lom"
}

smoke_checks() {
  STAGE="smoke"
  step "Health check bajarilmoqda (HTTP, mahalliy portlarda)"
  http_get "http://127.0.0.1:$API_PORT/api/v1/health/ready"
  if [ "$HTTP_CODE" != "200" ] || ! grep -q '"database":"up"' <<<"$HTTP_BODY"; then
    show_logs api
    die "API readiness javobi: HTTP $HTTP_CODE."
  fi
  ok "API:      http://127.0.0.1:$API_PORT/api/v1/health/ready -> 200 (baza ulangan)"
  http_get "http://127.0.0.1:$API_PORT/api/v1/catalog/categories?locale=uz"
  [ "$HTTP_CODE" = "200" ] || {
    show_logs api
    die "API katalog so'rovi: HTTP $HTTP_CODE."
  }
  ok "API:      /api/v1/catalog/categories -> 200"
  http_get "http://127.0.0.1:$WEB_PORT/api/health"
  [ "$HTTP_CODE" = "200" ] || {
    show_logs web
    die "Frontend health: HTTP $HTTP_CODE."
  }
  ok "Frontend: http://127.0.0.1:$WEB_PORT/api/health -> 200"
  http_get "http://127.0.0.1:$WEB_PORT/"
  [ "$HTTP_CODE" = "200" ] || {
    show_logs web
    die "Bosh sahifa: HTTP $HTTP_CODE."
  }
  ok "Frontend: http://127.0.0.1:$WEB_PORT/ (bosh sahifa) -> 200"
}

# Before the first successful deployment, the manual Compose commands (`--env-file .deploy.env`)
# use the images just built, instead of building an image of their own.
remember_built_images() {
  if [ -z "$SAVED_DEPLOYED_AT" ]; then
    SAVED_VERSION="$NEW_VERSION"
    write_deploy_file
  fi
}

record_success() {
  STAGE="done"
  [ -n "$SAVED_DEPLOYED_AT" ] || FIRST_SUCCESS=1
  # Only a release that has run counts as the one to roll back to.
  if [ -n "$SAVED_DEPLOYED_AT" ] && [ "$SAVED_VERSION" != "$NEW_VERSION" ]; then
    SAVED_PREVIOUS_VERSION="$SAVED_VERSION"
  fi
  SAVED_VERSION="$NEW_VERSION"
  SAVED_MEDIA_STORE="$MEDIA_STORE"
  SAVED_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  write_deploy_file
}

# ── Output ─────────────────────────────────────────────────────────────────────────────────────

container_line() {
  local id
  id="$(service_container "$1")"
  if [ -z "$id" ]; then
    printf 'yaratilmagan'
    return 0
  fi
  docker inspect --format '{{.Name}}: {{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}' "$id" | sed 's|^/||'
}

latest_migration() {
  local id
  id="$(service_container postgres)"
  [ -n "$id" ] || return 0
  printf '%s\n' "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC, migration_name DESC LIMIT 1;" |
    docker exec -i "$id" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -XAtq' 2>/dev/null || true
}

failed_migrations() {
  local id
  id="$(service_container postgres)"
  [ -n "$id" ] || return 0
  printf '%s\n' "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;" |
    docker exec -i "$id" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -XAtq' 2>/dev/null || true
}

print_summary() {
  local kind="Yangilash"
  if [ "$MODE" = "initial" ] || [ "$FIRST_SUCCESS" = 1 ]; then kind="Birinchi o'rnatish"; fi
  printf '\n%s%sTERAN muvaffaqiyatli ishga tushdi.%s\n' "$C_BOLD" "$C_GREEN" "$C_RESET"
  say "  Rejim:          $kind"
  say "  Compose loyiha: $PROJECT"
  say "  Versiya:        $SAVED_VERSION${SAVED_PREVIOUS_VERSION:+ (oldingi: $SAVED_PREVIOUS_VERSION)}"
  say "  Frontend:       http://127.0.0.1:$WEB_PORT -> web:$WEB_CONTAINER_PORT  [$(container_line web)]"
  say "  API:            http://127.0.0.1:$API_PORT/api/v1 -> api:$API_CONTAINER_PORT  [$(container_line api)]"
  say "  PostgreSQL:     $(container_line postgres); tashqariga ochilmagan"
  say "  Migratsiyalar:  $MIGRATION_SUMMARY; oxirgisi: $(latest_migration)"
  say "  Media:          $(media_label)"
  if [ -n "$BACKUP_FILE" ]; then
    say "  Zaxira:         $BACKUP_FILE"
  else
    say "  Zaxira:         kerak bo'lmadi (yangi bo'sh baza)"
  fi
  say ""
  say "Serverdagi Nginx bu portlarga yo'naltirishi kerak: sahifalar -> 127.0.0.1:$WEB_PORT,"
  say "/api/v1/ va /uploads/ -> 127.0.0.1:$API_PORT (docs/deployment/production.md, §7)."
  say "Domen va HTTPS bu skript tomonidan tekshirilmadi. Holat: ./deploy.sh --status"
}

status_command() {
  local ids latest failed backup="" detected
  command -v docker >/dev/null 2>&1 || die "Docker topilmadi."
  docker info --format '{{.ServerVersion}}' >/dev/null 2>&1 || die "Docker daemon'iga ulanib bo'lmadi (yoki kirish huquqi yo'q)."
  if [ -f "$DEPLOY_FILE" ]; then
    PROJECT="$(file_value "$DEPLOY_FILE" TERAN_COMPOSE_PROJECT)"
    WEB_PORT="$(file_value "$DEPLOY_FILE" TERAN_WEB_HOST_PORT)"
    API_PORT="$(file_value "$DEPLOY_FILE" TERAN_API_HOST_PORT)"
    BACKUP_DIR="$(file_value "$DEPLOY_FILE" TERAN_BACKUP_DIR)"
    SAVED_VERSION="$(file_value "$DEPLOY_FILE" TERAN_VERSION)"
    SAVED_PREVIOUS_VERSION="$(file_value "$DEPLOY_FILE" TERAN_PREVIOUS_VERSION)"
    SAVED_DEPLOYED_AT="$(file_value "$DEPLOY_FILE" TERAN_DEPLOYED_AT)"
    DEPLOY_BRANCH="$(file_value "$DEPLOY_FILE" TERAN_DEPLOY_BRANCH)"
  else
    PROJECT="${TERAN_COMPOSE_PROJECT:-$DEFAULT_PROJECT}"
  fi
  valid_project "$PROJECT" || die "Compose loyiha nomi noto'g'ri."
  ids="$(project_container_ids)"
  if [ ! -f "$DEPLOY_FILE" ] && [ -z "$ids" ]; then
    say "TERAN bu serverda hali deploy qilinmagan (.deploy.env ham, '$PROJECT' konteynerlari ham yo'q)."
    say "Birinchi o'rnatish: ./deploy.sh"
    return 0
  fi
  printf '%sTERAN holati%s\n' "$C_BOLD" "$C_RESET"
  say "  Compose loyiha: $PROJECT"
  if [ -f "$DEPLOY_FILE" ]; then
    local none="hali muvaffaqiyatli deploy yo'q"
    say "  Versiya:        ${SAVED_VERSION:-$none}${SAVED_PREVIOUS_VERSION:+ (oldingi: $SAVED_PREVIOUS_VERSION)}"
    say "  Deploy vaqti:   ${SAVED_DEPLOYED_AT:--}${DEPLOY_BRANCH:+, branch $DEPLOY_BRANCH}"
    say "  Portlar:        frontend 127.0.0.1:$WEB_PORT -> web:$WEB_CONTAINER_PORT, API 127.0.0.1:$API_PORT -> api:$API_CONTAINER_PORT"
  else
    warn ".deploy.env yo'q: bu konteynerlar deploy.sh bilan o'rnatilmagan. ./deploy.sh birinchi ishga tushganda portlarni so'raydi."
  fi
  say "  PostgreSQL:     $(container_line postgres)"
  say "  API:            $(container_line api)"
  say "  Frontend:       $(container_line web)"
  if [ -n "$WEB_PORT" ] && [ -n "$API_PORT" ]; then
    HTTP_TOOL="curl"
    command -v curl >/dev/null 2>&1 || HTTP_TOOL="wget"
    http_get "http://127.0.0.1:$API_PORT/api/v1/health/ready"
    say "  API health:     http://127.0.0.1:$API_PORT/api/v1/health/ready -> HTTP $HTTP_CODE"
    http_get "http://127.0.0.1:$WEB_PORT/api/health"
    say "  Frontend health: http://127.0.0.1:$WEB_PORT/api/health -> HTTP $HTTP_CODE"
  fi
  latest="$(latest_migration)"
  failed="$(failed_migrations)"
  say "  Migratsiyalar:  oxirgisi ${latest:--}${failed:+; muvaffaqiyatsiz: $failed}"
  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    backup="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' 2>/dev/null | sort | awk 'END { print }' || true)"
  fi
  say "  Oxirgi zaxira:  ${backup:--}"
  if [ -f "$ENV_FILE" ]; then
    detected="$(nginx_upstream_ports "$(origin_host)")"
    [ -z "$detected" ] || say "  Nginx (o'qildi): frontend ${detected%% *}, API ${detected##* }"
    if [ -n "$WEB_PORT" ]; then warn_nginx_mismatch "$detected"; fi
  fi
}

usage() {
  cat <<'EOF'
TERAN deploy skripti

Foydalanish:
  ./deploy.sh                      Birinchi marta: portlarni so'raydi va o'rnatadi.
                                   Keyingi safar: o'sha deploy'ni yangilaydi (savolsiz).
  ./deploy.sh --status             Holatni ko'rsatadi; hech narsani o'zgartirmaydi.
  ./deploy.sh --reconfigure-ports  Host portlarini qayta tanlaydi va API hamda frontend
                                   konteynerlarini yangi portlarda qayta yaratadi.
  ./deploy.sh --help               Shu yordam.

Qo'shimcha parametrlar:
  --web-port N --api-port N  Portlarni savolsiz berish (birinchi o'rnatish yoki
                             --reconfigure-ports). Ular ham tekshiriladi.
  --no-pull                  Yangilashda git'dan kod olmaydi: joriy lokal kod deploy qilinadi.
  --fresh-database           Bo'sh bazada yangi do'kon sxemasini yaratishga ruxsat (savolsiz).
  --yes                      --reconfigure-ports tasdig'ini savolsiz beradi.

Birinchi o'rnatishda saqlanadigan muhit o'zgaruvchilari:
  TERAN_COMPOSE_PROJECT  Compose loyiha nomi (standart: teran-production)
  TERAN_BACKUP_DIR       Zaxiralar papkasi (standart: ~/teran-backups/<loyiha>)
Har safar o'qiladigan:
  TERAN_HEALTH_TIMEOUT   Konteyner sog'lom bo'lishini kutish, soniya (standart: 300)
  TERAN_NGINX_DIRS       Upstream portlarini o'qish uchun Nginx papkalari (faqat o'qiladi)

Fayllar:
  .env.production  maxfiy sozlamalar: siz to'ldirasiz, skript faqat o'qiydi
  .deploy.env      portlar va deploy holati: skript yozadi, maxfiy emas, chmod 600

Yangilash tartibi: git (faqat fast-forward) -> image'lar -> PostgreSQL -> zaxira (pg_dump)
-> prisma migrate deploy -> API -> frontend -> HTTP tekshiruvlar.

Skript hech qachon: Nginx, TLS, DNS yoki firewall'ga tegmaydi; Docker volume'larini yoki
ma'lumotni o'chirmaydi; demo seed'ni ishga tushirmaydi; bazani tozalamaydi; maxfiy qiymatlarni
chiqarmaydi.
Batafsil: docs/deployment/production.md ("Deploy script").
EOF
}

# ── Main ───────────────────────────────────────────────────────────────────────────────────────

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h | --help) ACTION="help" ;;
      --status) ACTION="status" ;;
      --reconfigure-ports) ACTION="reconfigure" ;;
      --no-pull) NO_PULL=1 ;;
      --fresh-database) FRESH_DATABASE=1 ;;
      -y | --yes) ASSUME_YES=1 ;;
      --web-port)
        [ "$#" -ge 2 ] || die "--web-port qiymatsiz."
        CLI_WEB_PORT="$2"
        shift
        ;;
      --web-port=*) CLI_WEB_PORT="${1#*=}" ;;
      --api-port)
        [ "$#" -ge 2 ] || die "--api-port qiymatsiz."
        CLI_API_PORT="$2"
        shift
        ;;
      --api-port=*) CLI_API_PORT="${1#*=}" ;;
      *) die "Noma'lum parametr: $1 (yordam: ./deploy.sh --help)" ;;
    esac
    shift
  done
}

main() {
  trap 'on_error $? $LINENO "$BASH_COMMAND"' ERR
  trap 'on_interrupt INT' INT
  trap 'on_interrupt TERM' TERM
  trap on_exit EXIT
  parse_args "$@"
  case "$ACTION" in
    help)
      usage
      return 0
      ;;
    status)
      status_command
      return 0
      ;;
  esac

  printf '%sTERAN deploy boshlanmoqda.%s\n' "$C_BOLD" "$C_RESET"
  check_prerequisites
  acquire_lock
  load_settings
  if [ "$MODE" = "update" ]; then
    say "Mavjud deploy topildi (.deploy.env): loyiha '$PROJECT', portlar $WEB_PORT/$API_PORT. Yangilash rejimi."
    if [ "$ACTION" = "deploy" ]; then update_code; fi
  else
    say "Mavjud deploy topilmadi: birinchi o'rnatish."
    if [ "$EXISTING_VOLUME" = 1 ]; then
      warn "'${PROJECT}_postgres-data' volume'i allaqachon bor: undagi ma'lumot saqlanadi va migratsiyadan oldin zaxiralanadi."
    fi
  fi
  validate_env
  check_project_ownership
  if [ "$MODE" = "initial" ]; then
    choose_ports
    write_deploy_file
    ok "Portlar .deploy.env'da saqlandi (chmod 600): keyingi safar so'ralmaydi."
  elif [ "$ACTION" = "reconfigure" ]; then
    reconfigure_ports
  else
    check_saved_ports
    warn_nginx_mismatch "$(nginx_upstream_ports "$(origin_host)")"
  fi
  export TERAN_WEB_HOST_PORT="$WEB_PORT" TERAN_API_HOST_PORT="$API_PORT"
  check_compose_config
  compute_version
  check_media_store
  build_images
  start_postgres
  inspect_database
  if [ "$HAS_SCHEMA" = 1 ]; then backup_database; fi
  run_migrations
  STAGE="ports_late"
  check_saved_ports
  step "Frontend va backend ishga tushirilmoqda"
  start_service api "API (NestJS)"
  start_service web "Frontend (Next.js)"
  smoke_checks
  record_success
  print_summary
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
