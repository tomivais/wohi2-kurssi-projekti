const express=require('express');

const app = express();
const quizsRouter = require("./routes/quizs")
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/quizs", quizsRouter);
app.get("/", (req, res) => {
    res.status(404).json({message: "Not found"});
});



app.listen(PORT,()=>{
console.log(`Server is running on http://localhost:${PORT}`);
});