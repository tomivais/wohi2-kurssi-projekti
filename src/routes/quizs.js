const exprsess = require('express');
const router = exprsess.Router();
const prisma = require('../lib/prisma');


function formatQuiz(quiz){
    return {
        ...quiz,
        date : quiz.date.toISOString().split("T")[0],
        keywords: quiz.keywords.map((kw) => kw.name),
    };
}


//Get all quizs
router.get("/", async (req, res) => {
const{keyword} = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

const filterdQuizs = await prisma.quiz.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

  res.json(filterdQuizs.map(formatQuiz));
});


//Get quiz by id 
router.get("/:id", async (req, res) => {
  const quizId = Number(req.params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { keywords: true },
  });

  if (!quiz) {
    return res.status(404).json({ 
		message: "quiz not found" 
    });
  }
  res.json(formatQuiz(quiz));
});

//Create new quiz
router.post("/", async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer ) {
    return res.status(400).json({ msg: 
	"Question and answer are mandatory" });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newQuiz = await prisma.quiz.create({
    data: {
      question, answer,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatQuiz(newQuiz));
});



//edit quiz
router.put("/:id", async (req, res) => {
    const quizId = Number(req.params.id);   
    const {question, answer, keywords} = req.body;
   
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  
    if (!existingQuiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }
    if(!question || !answer|| !keywords){
        return res.status(400).json({message: "Question, answer or keywords are required" });
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
            question, answer,
            keywords: {
                set: [], 
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });
    res.json(formatQuiz(updatedQuiz));

});

//delete quiz
router.delete("/:id", async (req, res) => {
    const quizId = Number(req.params.id);

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId},
        include: { keywords: true},
    });

    if(!quiz){
        return res.status(404).json({message: "Quiz not found wortunately"});
    }

    await prisma.quiz.delete({
        where: { id: quizId }
    });

    res.json({message: "Quiz deleted successfully",
        quiz: formatQuiz(quiz)
    });
});

module.exports = router;