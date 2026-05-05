const express=require('express');

const app = express();
const quizsRouter = require("./routes/quizs") //Tuodaaan reitit
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma"); // Tuodaan Prisma-yhteys
const path = require("path");
const PORT = process.env.PORT || 3000; // Määritetään portti

app.use(express.static(path.join(__dirname, "..", "public"))); 

app.use(express.json());

//Routes eli reutit 
app.use("/api/questions", quizsRouter);
app.use("/api/auth", authRouter);

app.get("/", (req, res) => {
    res.status(404).json({
        message: "Not found"});
});


app.listen(PORT,()=>{
console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
