CREATE TABLE `CouponCustomer` (
  `couponId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  INDEX `CouponCustomer_userId_idx`(`userId`),
  PRIMARY KEY (`couponId`, `userId`),
  CONSTRAINT `CouponCustomer_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CouponCustomer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
