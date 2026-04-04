const exprsess = require('express');
const router = exprsess.Router();

const quizs = require('../data/quizs');


//Get all quizs
router.get("/", (req, res) => {
const{keyword} = req.query;
if(!keyword){
    return res.json(quizs);
}

const filteredquizs = quizs.filter(quiz => 
    quiz.keywords.includes(keyword.toLocaleLowerCase())
);
res.json(filteredquizs);
});


//Get quiz by id 
router.get("/:id", (req, res) => {
    const quizId = Number(req.params.id);

    const quiz = quizs.find((q) => q.id === quizId);
    if(!quiz){
        return res.status(404).json({message: "Quiz not found"});
    }
    res.json(quiz);
});

router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body;
    if(!question || !answer ){
        return res.status(400).json({message: "Question, answer and keywords are required"
        });
    }
    const maxId = Math.max(...quizs.map((q) => q.id), 0);

    const newQuiz = {
        id: quizs.length > 0 ? maxId + 1 : 1,
        question,
        answer,
        keywords:Array.isArray(keywords) ? keywords : [],
    };
    quizs.push(newQuiz);
    res.status(201).json(newQuiz);
});

//edit quiz
router.put("/:id", (req, res) => {
    const quizId = Number(req.params.id);   
    const {question, answer, keywords} = req.body;
   
    const quiz = quizs.find((q) => q.id === quizId);
    
    if(!quiz){
        return res.status(404).json({message: "Quiz not found"});
    }

    if(!question || !answer ){
        return res.json({message: "Question, answer and keywords are required"
        });
    }

    quiz.question = question;
    quiz.answer = answer;
    quiz.keywords = Array.isArray(keywords) ? keywords : [];
   
    res.json(quiz);
});

//delete quiz
router.delete("/:id", (req, res) => {
    const quizId = Number(req.params.id);

    const quizIndex = quizs.findIndex((q) => q.id === quizId);
    if(quizIndex === -1){
        return res.status(404).json({message: "Quiz not found"});
    }
    const deletedQuiz = quizs.splice(quizIndex, 1);
    res.json({message: "Quiz deleted successfully", 
        quiz: deletedQuiz
    });

});

module.exports = router;