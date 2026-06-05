const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const SECRET = process.env.JWT_SECRET;
const path = require("path");
const multer = require("multer");
const { ConflictError, UnauthorizedError } = require("../lib/errors");

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

// Post
router.post("/register", upload.single("image"),async (req, res, next) => {
    try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        throw new ValidationError("Email, password and name are required");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new ConflictError("Email already registered");
    }

    // 2. Määritetään kuvan polku, jos kuva on ladattu
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            imageUrl,
        },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "5h" });

    res.status(201).json({ 
        message: "User registered successfully",
        token });

    }
    catch (error) {
        next(error);}
    });

router.post("/login", async (req, res, next) => {
    try{
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ValidationError("Email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new UnauthorizedError ("Invalid credentials");
    }   

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        throw new UnauthorizedError("Invalid credentials");
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET, { expiresIn: "1h" });

    res.json({
        message: "Login successful",
        token,
    });
}
 catch (error) {
    next(error);
     }
});

module.exports = router; 