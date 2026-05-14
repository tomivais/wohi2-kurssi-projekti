const express=require('express');
const app = express();
const quizsRouter = require("./routes/quizs") //Tuodaaan reitit
const authRouter = require("./routes/auth");
const path = require("path");
const { NotFoundError } = require("./lib/errors");
const ErrorHandler = require("./middleware/errorHandler");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");

app.use(pinoHttp({ logger, autoLogging:{ ignore: (req) => req.url.startsWith("/uploads") } }));


app.use(express.static(path.join(__dirname, "..", "public"))); 

app.use(express.json());

//Routes eli reutit 
app.use("/api/questions", quizsRouter);
app.use("/api/auth", authRouter);

app.use((req, res) => {
  throw new NotFoundError();
});


app.use(ErrorHandler);
module.exports = app;
