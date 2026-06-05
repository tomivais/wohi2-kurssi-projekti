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
    hint: z.string().optional(),
    keywords: z.union([z.string(), z.array(z.string())]).optional(),
});


const storage = multer.diskStorage({
  destination: path.join(__dirname,"..","..","public","uploads"),
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


//Get hint by id 
router.get("/:id/hint", async (req, res, next) => {
  try{
  const quizId = Number(req.params.id);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId }  });

  if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
  
    // 2. Tarkistetaan onko vihje tyhjä, null vai undefined
    if (!quiz.hint || quiz.hint.trim() === "") {
      return res.json({ hint: "Ei vihjettä" });
    }

    // 3. Jos vihje löytyy, palautetaan se
    res.json({ hint: quiz.hint });
  }
  catch (error) {
    // Tämä siirtää virheen errorHandler.js:ään
    next(error); 
  }
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
    const { question, answer, keywords, hint } = QuizInput.parse(req.body);

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    
    // 2. Määritetään kuvan polku, jos kuva on ladattu
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 3. Tallennetaan tietokantaan
    const newQuiz = await prisma.quiz.create({
      data: {
        question,
        answer,
        imageUrl, // Lisätty tallennus tietokantaan
        hint,
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
    const { question, answer, keywords, hint } = QuizInput.parse(req.body);   
   
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  
    if (!existingQuiz) {
          throw new NotFoundError("Quiz not found");
    }
   
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const updatedQuiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
            question, answer, imageUrl, hint,
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
// Zod-skeema inputin validointiin (vastaa tietokannan rajoitteita)
const commentSchema = z.object({
  quizId: z.number().int(),
  comments: z.string().min(1, "Kommentti ei voi olla tyhjä").max(250, "Kommentti saa olla enintään 250 merkkiä")
});

//  Validoi VAIN bodyssä tulevan tekstin
const commentBodySchema = z.object({
  comments: z.string().min(1).max(250)
});

// POST /api/questions/:id/comments
// POST /api/questions/:id/comments
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const quizId = parseInt(req.params.id);
    
    if (isNaN(quizId)) {
      return res.status(400).json({ error: "Virheellinen ID URL-osoitteessa." });
    }

    // Validoidaan teksti bodystä (Zod)
    const { comments } = commentBodySchema.parse(req.body);
    
    // Haetaan käyttäjän ID
    const userId = req.user.userId || req.user.id; 

    // Tarkistetaan onko visa olemassa
    const quizExists = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quizExists) {
      throw new NotFoundError("Kysymystä ei löytynyt.");
    }

    // KORJAUS: Muutettu upsert -> create, koska @@unique([userId, quizId]) on poistettu
    const comment = await prisma.comment.create({
      data: {
        userId: userId,
        quizId: quizId,
        comments: comments
      },
    });

    res.status(201).json({ message: "Kommentti tallennettu", data: comment });
  } catch (error) {
    next(error); 
  }
});

// DELETE kommentti
// Sallittu: Kommentin luoneelle henkilölle TAI  quiz luoneelle henkilölle
router.delete('/:id/comments', authenticate, async (req, res, next) => {
  try {
    const quizId = parseInt(req.params.quizId);
    const currentUserId = req.user.userId; // Middlewarestasi päätellen käytössä on req.user.userId (eikä req.user.id)

    // 1. Haetaan kommentti ja liitetään mukaan sen kohteena oleva Quiz,
    // jotta saadaan selville visan luoja (quiz.userId)
    const comment = await prisma.comment.findUnique({
      where: {
        userId_quizId: {
          userId: currentUserId, // Tämä etsii suoraan kyseisen käyttäjän kommenttia
          quizId: quizId
        }
      },
      include: {
        quiz: true // Otetaan quiz-malli mukaan relaation kautta
      }
    });

    // 2. Jos kommenttia ei löydy kyseisen käyttäjän tekemänä, tarkistetaan tilanne visan luojan näkökulmasta
    if (!comment) {
      // Haetaan kommentti pelkän quizId:n perusteella, jotta voidaan tarkistaa, onko pyynnön tekijä visan omistaja
      const anyCommentOnQuiz = await prisma.comment.findFirst({
        where: { quizId: quizId },
        include: { quiz: true }
      });

      // Jos kyseiseen visaan ei ole lainkaan kommentteja
      if (!anyCommentOnQuiz) {
        throw new NotFoundError("Kommenttia ei löytynyt.");
      }

      // Jos kommentti on olemassa, mutta pyynnön tekijä EI OLE visan luoja
      if (anyCommentOnQuiz.quiz.userId !== currentUserId) {
        throw new ForbiddenError("Voit poistaa vain omia kommenttejasi tai luomiesi visojen kommentteja.");
      }

      // Jos päästään tänne asti, pyynnön tekijä ON visan luoja, joten hän saa poistaa minkä tahansa kommentin tästä visasta.
      // Koska mallissasi on @@unique([userId, quizId]), meidän täytyy tietää kenen kommenttia visan luoja on poistamassa.
      // Sitä varten bodyyn tai queryyn pitäisi välittää poistettavan kommentin tekijän ID (esim. req.body.targetUserId).
      
      const targetUserId = req.body.targetUserId ? parseInt(req.body.targetUserId) : null;
      if (!targetUserId) {
        return res.status(400).json({ error: "Visan luojan on määritettävä poistettavan kommentin käyttäjän ID (targetUserId) bodyssä." });
      }

      await prisma.comment.delete({
        where: {
          userId_quizId: {
            userId: targetUserId,
            quizId: quizId
          }
        }
      });

      return res.status(200).json({ message: "Visan luoja poisti kommentin onnistuneesti." });
    }

    // 3. Jos kommentti löytyi heti ensimmäisessä vaiheessa (eli käyttäjä on itse kommentin tekijä),
    // tai käyttäjä sattuu olemaan sekä kommentin tekijä että visan luoja:
    await prisma.comment.delete({
      where: {
        userId_quizId: {
          userId: currentUserId,
          quizId: quizId
        }
      }
    });

    res.status(200).json({ message: "Kommentti poistettu onnistuneesti." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;