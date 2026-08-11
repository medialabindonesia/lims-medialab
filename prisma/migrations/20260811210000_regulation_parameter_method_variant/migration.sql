-- Satu parameter boleh punya beberapa varian metode di dalam satu regulasi.
--
-- Sumber `MENU PENGUJIAN 2024.xlsx` menawarkan parameter yang sama dengan
-- metode uji berbeda pada regulasi yang sama, misalnya Nitrogen Dioxide (NO2)
-- pada PP 22/2021 lewat SNI 19-7119.2-2005 maupun MASA 408 Edisi 03 Tahun 1989.
-- Kunci unik lama hanya (regulationId, parameterId) sehingga varian kedua dan
-- seterusnya saling menimpa dan 331 layanan tidak pernah tampil di quotation.
--
-- Aman untuk data yang sudah ada: kolom baru bernilai string kosong, sehingga
-- kombinasi (regulationId, parameterId, '') tetap unik persis seperti aturan
-- sebelumnya. Tidak ada baris yang berubah maupun terhapus.

ALTER TABLE `RegulationParameter`
    ADD COLUMN `variantKey` VARCHAR(64) NOT NULL DEFAULT '';

-- Foreign key `regulationId` memakai awalan index unik lama sebagai
-- penopangnya, sehingga index itu tidak bisa langsung dibuang. Index pengganti
-- dibuat lebih dulu agar foreign key tetap punya penopang sepanjang proses.
CREATE INDEX `RegulationParameter_regulationId_idx`
    ON `RegulationParameter`(`regulationId`);

DROP INDEX `RegulationParameter_regulationId_parameterId_key` ON `RegulationParameter`;

CREATE UNIQUE INDEX `RegulationParameter_regulationId_parameterId_variantKey_key`
    ON `RegulationParameter`(`regulationId`, `parameterId`, `variantKey`);
