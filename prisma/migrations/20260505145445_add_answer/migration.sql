-- CreateTable
CREATE TABLE `answers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `quizId` INTEGER NOT NULL,
    `answer` VARCHAR(250) NOT NULL,

    UNIQUE INDEX `answers_userId_quizId_key`(`userId`, `quizId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `answers` ADD CONSTRAINT `answers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `answers` ADD CONSTRAINT `answers_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quiz`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
