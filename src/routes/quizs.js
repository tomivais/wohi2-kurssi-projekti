const exprsess = require('express');
const router = exprsess.Router();
const prisma = require('../lib/prisma');
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destinatuon: path.join(__dirname,"..","..","public","uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const newName= `${Date.now()}${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, newName);
  },
});

const upload = multer({ 
  storage, 
fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } 
  else {
    cb(new Error("Only image files are allowed"));
  }
},
limits: { fileSize: 5 * 1024 * 1024 }, 
})


// Apply authentication to ALL routes in this router
router.use(authenticate)

function formatQuiz(quiz){
    return {
        ...quiz,
        date : quiz.date.toISOString().split("T")[0],
        keywords: quiz.keywords.map((kw) => kw.name),
        userName: quiz.user?.name || null,
        answers: quiz.answer && quiz.answer.length > 0,
        answersCount: quiz._count?.answers || 0,
        user: undefined,
        _count: undefined,

    };
}

//Get all quizs //?page=1&limit=5
router.get("/", async (req, res) => {
const{keyword} = req.query;

  const where = keyword? 
  { keywords: { some: { name: keyword } } }: {};

const page = Math.max(1, parseInt(req.query.page)) || 1;
const limit = Math.max(1, Math.min(100, parseInt(req.query.limit))) || 5;
const skip = (page - 1) * limit; 


    
const [filterdQuizs, total] = await Promise.all([prisma.quiz.findMany({
    where,
    include: { 
      keywords: true , 
      user: true,
      answers:{where: { userId: req.user.id },take: 1},
      _count: { select: { answers: true } },
  },
    orderBy: { id: "asc" },
    skip,
    take: limit,
  })
  ,prisma.quiz.count({ where })]);

  res.json({
    data: filterdQuizs.map(formatQuiz),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })

});


//Get quiz by id 
router.get("/:id", async (req, res) => {
  const quizId = Number(req.params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { keywords: true , user: true},
  });

  if (!quiz) {
    return res.status(404).json({ 
		message: "quiz not found" 
    });
  }
  res.json(formatQuiz(quiz));
});

//Create new quiz
router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer ) {
    return res.status(400).json({ msg: 
	"Question and answer are mandatory" });
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const newQuiz = await prisma.quiz.create({
    data: {
      question, answer,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true, user: true },
  });

  res.status(201).json(formatQuiz(newQuiz));
});



//edit quiz
router.put("/:id", isOwner,upload.single("image"), async (req, res) => {
    const quizId = Number(req.params.id);   
    const {question, answer, keywords} = req.body;
   
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  
    if (!existingQuiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }
    if(!question || !answer|| !keywords){
        return res.status(400).json({message: "Question, answer or keywords are required" });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
            question, answer, imageUrl,
            keywords: {
                set: [], 
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });
    res.json(formatQuiz(updatedQuiz));

});

//delete quiz
router.delete("/:id", isOwner, async (req, res) => {
    const quizId = Number(req.params.id);

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId},
        include: { keywords: true, user: true },
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


// Tämän osalta on hyödynnetty tekoälyä, koska en muussa tapauksessa olisi saanut toteutetta vastausten lisäystä kysymyksiin. 
router.post("/:id/play", async (req, res) => {
  const { answer } = req.body;
  const quizId = parseInt(req.params.id);
  const userId = req.user ? parseInt(req.user.userId) : null;

  if (!answer || isNaN(quizId)) {
    return res.status(400).json({ msg: "Answer and valid Quiz ID are mandatory" });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      return res.status(404).json({ msg: "Quiz not found" });
    }

    const isCorrect = answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase();

 
    await prisma.answer.create({
      data: {
        answer: answer.toString(),
        user: { connect: { id: userId } },
        quiz: { connect: { id: quizId } }
      }
    });

    res.json({
      correct: isCorrect,
      correctAnswer: quiz.answer // Lähetetään oikea vastaus, jos käyttäjä tiesi väärin
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ msg: "You have already answered this quiz" });
    }

    console.error("Play error:", error);
    res.status(500).json({ msg: "Error processing your answer" });
  }
});

module.exports = router;