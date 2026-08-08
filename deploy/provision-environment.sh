#!/usr/bin/env bash
#
# Menyiapkan satu environment LIMS tambahan di VPS yang sama dengan produksi.
#
# Dijalankan sebagai root DI VPS, bukan dari GitHub Actions:
#
#   DB_PASSWORD='...' JWT_SECRET='...' \
#     bash provision-environment.sh marketing
#
# Yang dikerjakan (semuanya idempoten, aman diulang):
#   1. Membuat /opt/apps/lims-medialab-<slug>/{releases,shared/{logs,uploads}}
#   2. Membuat database dan user MariaDB khusus environment tersebut
#   3. Menulis shared/.env mode 600 milik user deploy
#
# Yang TIDAK dikerjakan, dan memang disengaja:
#   - tidak menyentuh /opt/apps/lims-medialab (produksi)
#   - tidak mengubah konfigurasi Nginx, DNS, SSL, atau firewall
#   - tidak menghentikan proses apa pun
#   - tidak pernah mencetak nilai password atau secret
#
# Blok server Nginx dicetak di akhir sebagai teks untuk Anda pasang sendiri.

set -Eeuo pipefail

SLUG="${1:-}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

log() { printf '[provision] %s\n' "$*"; }
fail() { printf '[provision] ERROR: %s\n' "$*" >&2; exit 1; }

case "$SLUG" in
  development) PORT=3002 ;;
  marketing)   PORT=3003 ;;
  coa)         PORT=3004 ;;
  production)
    fail "Environment produksi sudah ada dan tidak boleh di-provision ulang." ;;
  *)
    fail "Pemakaian: provision-environment.sh <development|marketing|coa>" ;;
esac

[[ "$(id -u)" -eq 0 ]] || fail "Jalankan sebagai root."
[[ -n "${DB_PASSWORD:-}" ]] || fail "Variabel DB_PASSWORD wajib diisi."
[[ -n "${JWT_SECRET:-}" ]] || fail "Variabel JWT_SECRET wajib diisi."
id "$DEPLOY_USER" >/dev/null 2>&1 || fail "User $DEPLOY_USER tidak ditemukan."

APP_NAME="lims-medialab-${SLUG}"
APP_ROOT="/opt/apps/${APP_NAME}"
DB_NAME="lims_${SLUG}"
DB_USER="lims_${SLUG}"

[[ "$APP_ROOT" != "/opt/apps/lims-medialab" ]] ||
  fail "Menolak menulis ke direktori produksi."

# ---------------------------------------------------------------- direktori
log "Menyiapkan $APP_ROOT"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 \
  "$APP_ROOT" \
  "$APP_ROOT/releases" \
  "$APP_ROOT/shared" \
  "$APP_ROOT/shared/logs" \
  "$APP_ROOT/shared/uploads"

# ----------------------------------------------------------------- database
log "Menyiapkan database $DB_NAME"

# Password dikirim lewat stdin, bukan argumen, agar tidak muncul di `ps`.
mariadb <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost'
  IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

# --------------------------------------------------------------------- .env
ENV_FILE="$APP_ROOT/shared/.env"

if [[ -f "$ENV_FILE" ]]; then
  log "shared/.env sudah ada — dibiarkan apa adanya (tidak ditimpa)."
else
  log "Menulis shared/.env"

  # umask memastikan file tidak pernah sempat terbaca user lain, bahkan
  # dalam jeda antara pembuatan dan chmod.
  (
    umask 077
    cat > "$ENV_FILE" <<ENV
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3306/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"

APP_ENV="${SLUG}"
NEXT_PUBLIC_APP_ENV="${SLUG}"

# Environment non-produksi boleh menampilkan akun demo.
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="true"

# Ditulis eksplisit agar lampiran environment ini tidak mungkin mendarat di
# direktori milik produksi.
SUPPORT_UPLOAD_DIR="${APP_ROOT}/shared/uploads"

# Realtime support otomatis no-op selama dikosongkan.
ABLY_API_KEY=""
ENV
  )

  chown "$DEPLOY_USER:$DEPLOY_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

# ------------------------------------------------------------------ ringkas
log "Selesai. Ringkasan (tanpa nilai secret):"
printf '\n'
printf '  environment : %s\n' "$SLUG"
printf '  app root    : %s\n' "$APP_ROOT"
printf '  pm2 name    : %s\n' "$APP_NAME"
printf '  port        : %s\n' "$PORT"
printf '  database    : %s\n' "$DB_NAME"
printf '  db user     : %s@localhost\n' "$DB_USER"
printf '  env file    : %s (%s)\n' "$ENV_FILE" "$(stat -c '%U:%G %a' "$ENV_FILE")"
printf '\n'

cat <<NGINX
Langkah berikutnya dikerjakan manual — script ini sengaja tidak menyentuh Nginx.

1. Buat /etc/nginx/sites-available/${APP_NAME} dari deploy/nginx.conf.example
   dengan penyesuaian:

     server_name  ${SLUG}.lims.medialab.co.id;
     proxy_pass   http://127.0.0.1:${PORT};
     location /uploads/ -> alias ${APP_ROOT}/shared/uploads/;

2. Aktifkan, uji, lalu muat ulang:

     ln -s /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
     nginx -t && systemctl reload nginx

3. Terbitkan sertifikat:

     certbot --nginx -d ${SLUG}.lims.medialab.co.id

4. Push ke branch terkait; GitHub Actions yang akan melakukan deploy pertama.

Environment ini BELUM punya tabel. Migrasi dijalankan otomatis oleh
scripts/deploy-vps.sh pada deployment pertama. Seed dijalankan manual:

     sudo -H -u ${DEPLOY_USER} bash -lc \\
       'cd ${APP_ROOT}/current && pnpm db:seed'
NGINX
