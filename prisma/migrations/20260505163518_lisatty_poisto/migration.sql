-- DropForeignKey
ALTER TABLE `answers` DROP FOREIGN KEY `answers_quizId_fkey`;

-- DropIndex
DROP INDEX `answers_quizId_fkey` ON `answers`;

-- AddForeignKey
ALTER TABLE `answers` ADD CONSTRAINT `answers_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
