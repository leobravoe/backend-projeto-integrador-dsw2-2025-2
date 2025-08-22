import express from 'express';
const app = express();
app.get("/", (req, res) => {
    res.send("olá mundo!!!");
});
app.get("/html", (req, res) => {
    res.send("<h1>teste</h1><p>Parágrafo</p>");
});
app.listen(3000, () => 
    console.log(`Servidor rodando em http://localhost:3000`)
);