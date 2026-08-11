-- Judul regulasi pada MENU PENGUJIAN 2024 mencapai 375 karakter.
-- Kolom lama VARCHAR(191) membuat import canonical berhenti di tengah.
ALTER TABLE `Regulation`
    MODIFY `name` TEXT NOT NULL;
