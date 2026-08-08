#!/usr/bin/env bash
set -Eeuo pipefail

# Nilai default sengaja identik dengan produksi yang sudah berjalan: memanggil
# script ini tanpa argumen ke-4 dan ke-5 berperilaku persis seperti sebelumnya.
RELEASE_DIR="${1:-}"
APP_ROOT="${2:-/opt/apps/lims-medialab}"
RELEASE_ID="${3:-unknown}"
APP_NAME="${4:-lims-medialab}"
APP_PORT="${5:-3001}"
APP_ENV="${6:-production}"
HEALTH_URL="http://127.0.0.1:${APP_PORT}/api/health"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$RELEASE_DIR" = /* ]] || fail "RELEASE_DIR harus berupa absolute path"
[[ "$APP_ROOT" = /* ]] || fail "APP_ROOT harus berupa absolute path"
[[ "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "APP_ROOT mengandung karakter tidak valid"
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9._-]+$ ]] || fail "RELEASE_ID tidak valid"
[[ "$APP_NAME" =~ ^[A-Za-z0-9._-]+$ ]] || fail "APP_NAME tidak valid"
[[ "$APP_PORT" =~ ^[0-9]{2,5}$ ]] || fail "APP_PORT tidak valid"
[[ "$APP_ENV" =~ ^[a-z0-9-]+$ ]] || fail "APP_ENV tidak valid"
[[ -d "$RELEASE_DIR" ]] || fail "Direktori release tidak ditemukan: $RELEASE_DIR"

APP_ROOT_REAL="$(readlink -f "$APP_ROOT")"
RELEASE_REAL="$(readlink -f "$RELEASE_DIR")"
case "$RELEASE_REAL" in
  "$APP_ROOT_REAL"/releases/*) ;;
  *) fail "Release harus berada di $APP_ROOT_REAL/releases" ;;
esac

for command_name in curl flock pm2 pnpm; do
  command -v "$command_name" >/dev/null 2>&1 || fail "$command_name belum terpasang"
done

install -d -m 0755 "$APP_ROOT/shared/logs" "$APP_ROOT/shared/uploads"
[[ -f "$APP_ROOT/shared/.env" ]] || fail "$APP_ROOT/shared/.env belum dibuat"

exec 9>"$APP_ROOT/.deploy.lock"
flock -n 9 || fail "Deployment lain sedang berjalan"

if [[ -e "$APP_ROOT/current" && ! -L "$APP_ROOT/current" ]]; then
  fail "$APP_ROOT/current harus berupa symlink, bukan direktori biasa"
fi

PREVIOUS_RELEASE=""
if [[ -L "$APP_ROOT/current" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "$APP_ROOT/current")"
fi

ln -sfn "$APP_ROOT/shared/.env" "$RELEASE_DIR/.env"
install -d -m 0755 "$RELEASE_DIR/storage"
if [[ -e "$RELEASE_DIR/storage/uploads" && ! -L "$RELEASE_DIR/storage/uploads" ]]; then
  fail "$RELEASE_DIR/storage/uploads harus berupa symlink"
fi
ln -sfn "$APP_ROOT/shared/uploads" "$RELEASE_DIR/storage/uploads"

cd "$RELEASE_DIR"
export NODE_ENV=production

log "Environment: $APP_ENV (pm2: $APP_NAME, port: $APP_PORT)"

log "Menginstal dependency release $RELEASE_ID"
pnpm install --frozen-lockfile

log "Membangun aplikasi"
pnpm build

log "Menerapkan migrasi database produksi"
pnpm exec prisma migrate deploy

activate_release() {
  local target="$1"
  local temporary_link="$APP_ROOT/.current-$RELEASE_ID"

  ln -sfn "$target" "$temporary_link"
  mv -Tf "$temporary_link" "$APP_ROOT/current"
}

start_application() {
  local version="$1"

  APP_ROOT="$APP_ROOT" APP_NAME="$APP_NAME" APP_PORT="$APP_PORT" \
  APP_ENV="$APP_ENV" APP_VERSION="$version" \
    pm2 startOrReload "$APP_ROOT/current/ecosystem.config.js" --update-env

  # Semua environment berjalan sebagai user `deploy` dan berbagi satu dump PM2.
  # Lock di $APP_ROOT hanya menyerialkan deployment dalam satu environment,
  # sehingga `pm2 save` dari dua environment sekaligus bisa saling menimpa.
  (
    exec 8>"$HOME/.lims-pm2.lock"
    flock 8
    pm2 save
  )
}

log "Mengaktifkan release baru"
activate_release "$RELEASE_DIR"
start_application "$RELEASE_ID"

log "Menunggu health check"
healthy=false
for _ in {1..20}; do
  if curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  log "Health check gagal"

  if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
    log "Mengembalikan release sebelumnya: $PREVIOUS_RELEASE"
    activate_release "$PREVIOUS_RELEASE"
    start_application "$(basename "$PREVIOUS_RELEASE")"
  else
    log "Belum ada release sebelumnya; menghentikan proses yang gagal"
    pm2 delete "$APP_NAME" || true
    (
      exec 8>"$HOME/.lims-pm2.lock"
      flock 8
      pm2 save
    ) || true
    rm -f "$APP_ROOT/current"
  fi

  fail "Release $RELEASE_ID tidak lolos health check"
fi

log "Release $RELEASE_ID aktif dan sehat"
