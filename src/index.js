const express=require('express');

const app = express();
const quizsRouter = require("./routes/quizs") //Tuodaaan reitit
const prisma = require("./lib/prisma"); // Tuodaan Prisma-yhteys
const PORT = process.env.PORT || 3000; // Määritetään portti

app.use(express.json());
app.use("/api/quizs", quizsRouter);
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
