# Knowledge Pack: LIMS Medialab VPS Deployment

Dokumen ini adalah handoff non-secret untuk agen Codex yang berjalan langsung
di VPS produksi. Jangan menambahkan private key, password database, JWT, API
key, atau isi file `.env` ke dokumen maupun output terminal.

## Sasaran

Menyiapkan prerequisite VPS agar workflow GitHub Actions dapat mengirim,
membangun, memigrasikan, dan mengaktifkan release LIMS Medialab sebagai user
Linux non-root `deploy`.

## Fakta infrastruktur terverifikasi

- OS: Ubuntu 24.04.4 LTS x86_64.
- Hostname: `host174779416976`.
- IP deployment: `38.47.176.211`, port SSH `22`.
- App root: `/opt/apps/lims-medialab`.
- Release root: `/opt/apps/lims-medialab/releases`.
- Shared state: `/opt/apps/lims-medialab/shared`.
- Persistent uploads: `/opt/apps/lims-medialab/shared/uploads`.
- Shared logs: `/opt/apps/lims-medialab/shared/logs`.
- Shared production env: `/opt/apps/lims-medialab/shared/.env`.
- Process user: `deploy`.
- PM2 app name: `lims-medialab`.
- Next.js port: `3001`, hanya diakses melalui Nginx.
- Health endpoint: `http://127.0.0.1:3001/api/health`.
- Host-key fingerprint terverifikasi:
  `SHA256:Tvef6HALOMqP74Hd1zXMoTQE5ZJlIVQ7/HgQcfqfbrs`.
- Deploy-key fingerprint terverifikasi:
  `SHA256:SiNqsXM3YlbQhLL14ZVdWQQdbcw2VW756vc6FJNx+Qo`.

Fingerprint bersifat publik. Private deploy key hanya boleh berada di komputer
tepercaya dan GitHub Secret `VPS_SSH_KEY`; private key tidak boleh disalin ke
VPS.

## Stack aplikasi

- Next.js 16.2.9 dan React 19.
- Prisma 7.8 dengan MariaDB/MySQL.
- Node.js minimal 22.
- pnpm dikunci pada 10.15.0.
- PM2 menjalankan aplikasi melalui `ecosystem.config.js`.
- Workflow berada di `.github/workflows/deploy.yml`.
- Remote deploy script berada di `scripts/deploy-vps.sh`.

## Kondisi terakhir yang sudah terverifikasi

- User `deploy` sudah ada.
- Login key-based sebagai `deploy` sudah berhasil dari Windows tanpa password.
- `/home/deploy/.ssh` dimiliki `deploy:deploy`, mode `700`.
- `/home/deploy/.ssh/authorized_keys` dimiliki `deploy:deploy`, mode `600`.
- Public key di `authorized_keys` cocok dengan deploy-key fingerprint.
- `/opt/apps/lims-medialab` sudah dimiliki `deploy:deploy`, mode `755`.
- Direktori `releases`, `shared/uploads`, dan `shared/logs` sudah dibuat sebagai
  `deploy:deploy`, mode `755`.
- User `deploy` sudah terverifikasi dapat menulis ke app root.
- `shared/.env` sudah tersedia, dimiliki `deploy:deploy`, mode `600`.
- Path `/opt/apps/lims-medialab/current` belum ada; ini kondisi yang benar untuk
  deployment pertama.
- `curl`, `flock`, dan `rsync` tersedia system-wide.
- `node`, `pnpm`, dan `pm2` belum tersedia bagi user `deploy`.
- Root memiliki Node melalui NVM, tetapi instalasi itu tidak tersedia dalam SSH
  non-interaktif milik `deploy` dan tidak boleh menjadi dependency deployment.
- Root memiliki konfigurasi `.npmrc` yang konflik dengan NVM; instalasi npm
  system-wide harus mengabaikan user config tersebut.
- Status port `3001` dan proses lama belum diverifikasi.

## Perilaku pipeline

Job CI menjalankan lint, migrasi pada MariaDB sementara, dan build. Job deploy:

1. Memverifikasi fingerprint private deploy key.
2. Mengambil public host key dan memverifikasi fingerprint VPS.
3. Login sebagai `deploy`.
4. Membuat `releases/<git-sha>`.
5. Mengirim source menggunakan rsync.
6. Menjalankan `scripts/deploy-vps.sh` sebagai `deploy`.

Deploy script kemudian:

1. Memastikan `curl`, `flock`, `pm2`, dan `pnpm` tersedia.
2. Menautkan `shared/.env` dan persistent uploads ke release.
3. Menjalankan `pnpm install --frozen-lockfile`.
4. Menjalankan `pnpm build`.
5. Menjalankan `pnpm exec prisma migrate deploy`.
6. Mengaktifkan release melalui symlink atomik `current`.
7. Menjalankan/reload PM2 sebagai user `deploy`.
8. Memeriksa health endpoint dan rollback kode jika tidak sehat.

Rollback kode tidak membatalkan migrasi database. Migrasi produksi harus tetap
backward-compatible.

## Tindakan yang masih diperlukan

### 1. Preflight aman

Jalankan pemeriksaan tanpa mencetak isi secret:

```bash
id deploy
stat -c '%U:%G %a %n' /opt/apps/lims-medialab /opt/apps/lims-medialab/releases /opt/apps/lims-medialab/shared /opt/apps/lims-medialab/shared/.env
sudo -H -u deploy test -w /opt/apps/lims-medialab
grep -q '^DATABASE_URL=' /opt/apps/lims-medialab/shared/.env
grep -q '^JWT_SECRET=' /opt/apps/lims-medialab/shared/.env
ss -ltnp | grep ':3001' || true
```

Jangan menjalankan `cat`, `sed`, `env`, atau debugging lain yang menampilkan
nilai secret dari `shared/.env`.

### 2. Instal Node 22 system-wide

Gunakan paket system-wide agar tersedia dalam SSH non-interaktif:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup_22.sh
bash /tmp/nodesource_setup_22.sh
apt-get install -y nodejs
/usr/bin/node --version
/usr/bin/npm --version
```

Versi Node wajib `v22.x` atau versi lebih tinggi yang kompatibel dengan Prisma
7, tetapi konsistensi dengan CI saat ini mengutamakan Node 22.

### 3. Instal pnpm dan PM2 system-wide

Abaikan `.npmrc` root ketika memasang global tools:

```bash
NPM_CONFIG_USERCONFIG=/dev/null /usr/bin/npm install --global pnpm@10.15.0 pm2@latest
```

Verifikasi dari konteks user deployment:

```bash
sudo -H -u deploy /bin/bash -lc 'node --version'
sudo -H -u deploy /bin/bash -lc 'pnpm --version'
sudo -H -u deploy /bin/bash -lc 'pm2 --version'
```

### 4. Aktifkan PM2 untuk user deploy

Gunakan binary system-wide, bukan PM2 dari NVM root:

```bash
env PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/pm2 startup systemd -u deploy --hp /home/deploy
sudo -H -u deploy /usr/bin/pm2 save
systemctl status pm2-deploy --no-pager
```

### 5. Audit konflik port/proses lama

Sebelum workflow diulang:

```bash
ss -ltnp | grep ':3001' || true
ps -ef | grep '[n]ext.*start' || true
pm2 list || true
sudo -H -u deploy /usr/bin/pm2 list || true
```

Jika port `3001` sedang dipakai, identifikasi owner dan service manager. Jangan
menghentikan proses aktif secara otomatis. Proses lama mungkin merupakan LIMS
yang sedang melayani pengguna dan memerlukan cutover terkontrol.

## Batas keselamatan

Tanpa konfirmasi tambahan dari pemilik:

- jangan mencetak atau mengubah isi `.env`;
- jangan menghapus/memindahkan instalasi lama atau release;
- jangan menghentikan proses yang mendengarkan pada port `3001`;
- jangan menjalankan reset database, `prisma migrate reset`, `db push`, atau
  seed produksi;
- jangan mengubah konfigurasi Nginx/aaPanel, DNS, SSL, atau firewall;
- jangan menggunakan `chmod 777`;
- jangan menjalankan aplikasi produksi sebagai `root`;
- jangan menyalin private SSH key ke VPS.

Tindakan yang diizinkan dalam handoff ini: diagnosis read-only, instalasi paket
system-wide Node 22/pnpm/PM2, konfigurasi startup PM2 untuk `deploy`, dan
perbaikan ownership hanya pada path aplikasi yang disebutkan bila diperlukan.

## Kriteria selesai

VPS dinyatakan siap untuk rerun GitHub Actions jika:

- `deploy` bisa menulis app root;
- `shared/.env` ada, mode `600`, owner `deploy:deploy`, dan memiliki nama
  variable wajib tanpa menampilkan nilainya;
- `node --version` sebagai `deploy` menunjukkan Node 22;
- `pnpm --version` sebagai `deploy` menunjukkan 10.15.0;
- `pm2 --version` sebagai `deploy` berhasil;
- service `pm2-deploy` aktif/enabled;
- status port `3001` diketahui;
- tidak ada konflik `current` berupa direktori biasa;
- tidak ada secret yang dicetak ke log.
