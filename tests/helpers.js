const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

async function resetDb(){
    await prisma.answer.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.user.deleteMany();
    await prisma.keyword.deleteMany();
}

async function registerAndLogin(email="a@test.io",name="A"){
    await request(app).post("/api/auth/register").send({email,name ,password:"123456"});
    const res = await request(app).post("/api/auth/login").send({email,password:"123456"});
    return res.body.token;
}

async function createQuiz(token,overrides={}){
    const res = await request(app).post("/api/questions").set("Authorization", `Bearer ${token}`).send({
        question: "What is the capital of France?",
        answer: "Paris", ...overrides})
    return res.body;
}
module.exports = {
    resetDb,
    registerAndLogin,
    createQuiz,
    request, 
    app,
    prisma
};