ALTER TABLE `ProductImage` ADD COLUMN `mediaId` CHAR(36) NULL;
CREATE INDEX `ProductImage_mediaId_idx` ON `ProductImage`(`mediaId`);
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
