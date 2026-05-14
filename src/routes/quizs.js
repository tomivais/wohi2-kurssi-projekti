const exprsess = require('express');
const router = exprsess.Router();
const prisma = require('../lib/prisma');
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const { NotFoundError } = require('../lib/errors');
const {z} = require("zod");
const { tr } = require('zod/v4/locales');

const QuizInput = z.object({
    question: z.string().min(1, "Question is required"),
    answer: z.string().min(1, "Answer is required"),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
});


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
router.get("/:id", async (req, res, next) => {
  try{
  const quizId = Number(req.params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { keywords: true , user: true},
  });

  if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

  res.json(formatQuiz(quiz));
  }
  catch (error) {
    // Tämä siirtää virheen errorHandler.js:ään
    next(error); 
  }
});


// Create new quiz
router.post("/", upload.single("image"), async (req, res, next) => {
 // Tämä vaati toimiakseen try catch -rakenteen, jotta Zod-virheet saatiin käsiteltyä. 
  try {
    // 1. Validoidaan body Zodilla
    // Huom: Jos lähetät keywordsit form-datana, ne saattavat vaatia JSON.parse() käsittelyn
    const { question, answer, keywords } = QuizInput.parse(req.body);

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    
    // 2. Määritetään kuvan polku, jos kuva on ladattu
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 3. Tallennetaan tietokantaan
    const newQuiz = await prisma.quiz.create({
      data: {
        question,
        answer,
        imageUrl, // Lisätty tallennus tietokantaan
        userId: req.user.userId,
        keywords: {
          connectOrCreate: keywordsArray.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
      include: { keywords: true, user: true },
    });

    res.status(201).json(formatQuiz(newQuiz));
  } catch (error) {
    // 4. Ohjataan virhe errorHandlerille (ZodError, PrismaError, jne.)
    next(error);
  }
});


//edit quiz
router.put("/:id", isOwner,upload.single("image"), async (req, res, next) => {
  try {
    const quizId = Number(req.params.id);
    // Validointi Zod-kirjastolla
    const { question, answer, keywords } = QuizInput.parse(req.body);   
   
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  
    if (!existingQuiz) {
          throw new NotFoundError("Quiz not found");
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
  }
  catch (error) {
    next(error);
  }
});

//delete quiz
router.delete("/:id", isOwner, async (req, res) => {
    const quizId = Number(req.params.id);

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId},
        include: { keywords: true, user: true },
    });

    if(!quiz){
        throw new NotFoundError("Quiz not found unfortunately");
    }

    await prisma.quiz.delete({
        where: { id: quizId }
    });

    res.json({message: "Quiz deleted successfully",
        quiz: formatQuiz(quiz)
    });
});


// Tämän osalta on hyödynnetty tekoälyä vastauksen tallennuksen ja laskennan toteuttamiseen.
router.post("/:id/play", async (req, res, next) => {
  const { answer } = req.body;
  const quizId = parseInt(req.params.id);
  const userId = req.user ? parseInt(req.user.userId) : null;

  try {
    // 1. Validointi: Onko vastaus annettu ja ID numero?
    if (!answer || isNaN(quizId)) {
      throw new ValidationError("Answer is mandatory");
    }

    // Upsert vaatii kirjautuneen käyttäjän, jotta userId_quizId -tunniste toimii.
    if (!userId) {
      throw new UnauthorizedError("You must be logged in to submit an answer");
    }

    // 2. Haetaan kysely tietokannasta vastauksen tarkistusta varten
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    // 3. Tarkistetaan onko vastaus oikein
    const isCorrect = answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase();

    // 4. Tallennetaan tai päivitetään vastaus (Upsert)
    const savedAnswer = await prisma.answer.upsert({
      where: {
        userId_quizId: {
          userId: userId,
          quizId: quizId
        }
      },
      update: {
        answer: answer.toString()
      },
      create: {
        answer: answer.toString(),
        userId: userId,
        quizId: quizId
      }
    });

    // Lasketaan kuinka monta vastausta tähän kyselyyn on yhteensä annettu
    const answerCount = await prisma.answer.count({
      where: { quizId: quizId }
    });

    // 5. Palautetaan tulos
    res.status(200).json({
      id: savedAnswer.id,
      quizId: quizId,
      correct: isCorrect,
      correctAnswer: quiz.answer,
      answerCount: answerCount, // Palautetaan vastausten kokonaismäärä
      createdAt: savedAnswer.createdAt
    });

  } catch (error) {
    // Kaikki virheet ohjataan error.js:n mukaiselle globaalille käsittelijälle
    next(error);
  }
});


module.exports = router;