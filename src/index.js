const express=require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/',(req,res)=>{
    res.json({message:"Hello, wordl"});
});

app.get('/health',(req,res)=>{
    res.json({status:"ok",timestamp:new Date().toISOString()  });
});


app.listen(PORT,()=>{
console.log(`Server is running on http://localhost:${PORT}`);
});