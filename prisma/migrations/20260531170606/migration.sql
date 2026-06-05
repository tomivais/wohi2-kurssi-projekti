-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_userId_fkey`;

-- DropIndex
DROP INDEX `comments_userId_quizId_key` ON `comments`;

-- AddForeignKey
ALTER TABLE `_KeywordToQuiz` ADD CONSTRAINT `_KeywordToQuiz_A_fkey` FOREIGN KEY (`A`) REFERENCES `keywords`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
