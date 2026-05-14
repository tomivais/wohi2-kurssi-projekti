const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");


async function isOwner (req, res, next) {
    const id = Number(req.params.id);
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { keywords: true },
    });
    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }
    if (quiz.userId !== req.user.userId) {
      throw new ForbiddenError("You can only modify your own quiz");
    }
    req.quiz = quiz;
    next();
  
}
module.exports = isOwner;