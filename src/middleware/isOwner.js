const prisma = require("../lib/prisma");


async function isOwner (req, res, next) {
    const id = Number(req.params.id);
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { keywords: true },
    });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    if (quiz.userId !== req.user.userId) {
      return res.status(403).json({ error: "You can only modify your own quiz" });
    }
    // Attach the record to the request so the route handler can reuse it
    req.quiz = quiz;
    next();
  
}
module.exports = isOwner;