const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuizs = [
  {
    id:1,
    question: "Why use javascript?",
    answer: "JavaScript is a versatile programming language that allows you to create interactive and dynamic web pages. It is widely used for front-end development to enhance user experience by enabling features like form validation, animations, and real-time updates. Additionally, JavaScript can be used on the server-side with Node.js, making it a popular choice for full-stack development. Its large ecosystem of libraries and frameworks also makes it easier to build complex applications efficiently.",
    keywords: ["javascript", "programming", "web development"],     
},

     {
    id:2,
    question: "How use javascript?",
    answer: "To use JavaScript, you can include it in your HTML file using the <script> tag. You can write JavaScript code directly within the <script> tag or link to an external JavaScript file. Once included, you can use JavaScript to manipulate the DOM, handle events, and create interactive web pages. You can also use JavaScript frameworks and libraries like React, Angular, or Vue.js to build more complex applications.",
    keywords: ["javascript", "programming", "web development"], 
    },

     {
    id:3,
    question: "How graduate computer science?",
    answer: "To graduate in computer science, you typically need to complete a bachelor's degree program in computer science or a related field. This involves taking courses in programming, algorithms, data structures, computer architecture, and other relevant subjects. You may also need to complete a capstone project or internship to gain practical experience. It's important to maintain good grades and meet all the requirements set by your educational institution to successfully graduate.",
    keywords: ["computer science", "education", "graduation"],
    },

     {
    id:4,
    question: "How to learn programming?",
    answer: "You can learn programming by taking online courses, reading books, practicing coding exercises, and building projects. It's important to start with the basics and gradually move on to more advanced topics. Consistency and hands-on practice are key to becoming proficient in programming.",
    keywords: ["programming", "learning", "coding"],
    },
];

async function main() {
  await prisma.quiz.deleteMany();
  await prisma.keyword.deleteMany();

  for (const quiz of seedQuizs) {
    await prisma.quiz.create({
      data: {
       question: quiz.question, 
        answer: quiz.answer,    
        keywords: {
          connectOrCreate: quiz.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw }, 
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

