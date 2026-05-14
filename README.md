# Web programming 2 project

## In this project, we are developing a quiz application. 

## 1 week (week 13)
Step 1: Project Setup In this step, we will create the foundation of the backend project by setting up a Node.js project with Express.


## 2 week (week 14-15)
Step 2: Having a REST API
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| GET |  /questions |  List all questions |
| GET |  /questions/:Id |  List all questions |
| POST |  /questions |  Create a new question |
| PUT |  /questions/:qId |  Edit a question |
| DELETE |  /questions/:qId |  Delete a question |


## 3 week (week 16)
Step 3:Adding the DB and ORM
Before: Data stored in a JS object
After: Data stored in MySQL. 
- We do that with Prisma.


## 4 week (week 17)
Authentication

1. New dependencies: 
bcrypt + jsonwebtoken
2. User model in Prisma schema
3. Auth routes: –/api/auth/register –/api/auth/login
4. Auth middleware to verify JWT tokens
5. Protect POST, PUT, DELETE routes


## 5week (week 18-19)
Advanced features

What we are doing this week
Adding a frontend client which requires backend modifications:
- Serving static files (HTML, CSS, JS) from our server
- Some small API modifications (e.g., pagination)
- API: include the author’s name
- Pagination
- Serve the frontend from Express

New extra features
- Answer (new model + endpoints)
Image upload (multer + new field)



