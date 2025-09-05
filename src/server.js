// server.js
import express from "express";
import { pool } from "./db.js";
const app = express();
app.use(express.json());
// ROTAS
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /produtos",
            "MOSTRAR": "GET /produtos/:id",
            "CRIAR": "POST /produtos BODY: { nome: 'string', preco: Number }",
            "SUBSTITUIR": "PUT /produtos/:id BODY: { nome: 'string', preco: Number }",
            "ATUALIZAR": "PATCH /produtos/:id BODY: { nome: 'string' || preco: Number }",
            "DELETAR": "DELETE /produtos/:id",
        }
        res.json(rotas);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// LISTAR
app.get("/produtos", async (_req, res) => {
    try {
        // O resultado de pool.query é um objeto que contem a chave rows
        // O comando const { rows } cria a variável rows e coloca dentro dela o conteúdo da chave rows do objeto gerado por pool.query 
        const { rows } = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
        res.json(rows);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// MOSTRAR (show)
app.get("/produtos/:id", async (req, res) => {
    // Todas as variáveis que chegam dentro do objeto req são strings

    // É criada a variável id como constante
    // O resultado de Number(req.params.id) é um número ou NaN (quando falha a conversão)
    const id = Number(req.params.id);
    // !Number.isInteger(id) verifica se o id não é um inteiro
    // id <= 0 verifica se o id é menor ou igual a zero.
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    try {
        // Crio uma variável constante chamada result 
        // Espero a função .query do objeto pool executar (await)
        // Depois que ela terminar de executar o valor é armazenado em result
        // Dentro de result tem os dados do banco que o select retorna e maior um monte de outras coisas
        const result = await pool.query("SELECT * FROM produtos WHERE id = $1", [id]);
        // Crio uma constante com um objeto e a variável rows dentro
        // A atribuição procura dento de result uma chave com o mesmo nome da variável
        // Caso encontre essa chave, o valor dela é copiado para a variável rows
        const { rows } = result;
        // Pego a primeira posição do array e verifico se ela não existe
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        // Retorna a primeira posição
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// CRIAR
app.post("/produtos", async (req, res) => {
    // Todas as variáveis que chegam dentro do objeto req são strings

    // Dentro de req tenho as coisas que vem o cliente
    // Dentro de res tenho as coisas que irão para o cliente

    // O objeto enviado do cliente para o backend estará dentro do corpo da requisição
    // Ou seja, estará dentro de req.body

    // Caso 1: O objeto enviado pelo cliente tem as chaves: nome e preco
    //      -> Nesse caso as variáveis nome e preço recebem o conteúdo do req.body
    // Caso 2: Nada foi enviado pelo cliente ou seja, req.body é undefined
    //      -> Nesse caso `req.body ?? {}` é visto como `undefined ?? {}`
    //      -> Assim a operação completa seria simplificada para `const {nome, preco} = {}`
    //      -> Desta forma as variáveis nome e preço ficariam com valor undefined
    // Caso 3: Um json qualquer foi enviado para o backend (sem as chaves nome e preco)
    //      -> Nesse caso as variáveis nome e preço ficariam com valor undefined
    const { nome, preco } = req.body ?? {};
    const p = Number(preco);
    // preco deve ser número >= 0
    // !nome verifica se ela não existe
    // preco == null verifica se o usuário mandou preco: null (que não pode aceitar) pois Number(null) é igual a 0
    // Number.isNaN verifica se a conversão deu certo
    // p < 0 Verifica se o numero é negativo
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }
    try {
        // O resultado de pool.query é um objeto que contem a chave rows
        // O comando const { rows } cria a variável rows e coloca dentro dela o conteúdo da chave rows do objeto gerado por pool.query
        const { rows } = await pool.query(
            "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
            [nome, p]
        );
        // rows contém um array com uma posição. 
        // Nessa posição está o objeto com os dados que recém foram inseridos no banco
        res.status(201).json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// SUBSTITUIR (PUT) — envia todos os campos
app.put("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};
    const p = Number(preco);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    if (!nome || preco == null || Number.isNaN(p) || p < 0) {
        return res.status(400).json({ erro: "nome e preco (>= 0) obrigatórios" });
    }
    try {
        const { rows } = await pool.query(
            "UPDATE produtos SET nome = $1, preco = $2 WHERE id = $3 RETURNING *",
            [nome, p, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// ATUALIZAR (PATCH) — envia só o que quiser
// COALESCE(a, b): devolve 'a' quando 'a' NÃO é NULL; caso seja NULL, devolve 'b'.
// Aqui: se não enviar um campo, passamos NULL e o COALESCE mantém o valor atual do banco.
app.patch("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, preco } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    if (nome === undefined && preco === undefined) return res.status(400).json({ erro: "envie nome e/ou preco" });
    // Se 'preco' foi enviado, precisa ser número >= 0
    let p = null;
    if (preco !== undefined) {
        p = Number(preco);
        if (Number.isNaN(p) || p < 0) {
            return res.status(400).json({ erro: "preco deve ser número >= 0" });
        }
    }
    try {
        const { rows } = await pool.query(
            "UPDATE produtos SET nome = COALESCE($1, nome), preco = COALESCE($2, preco) WHERE id = $3 RETURNING *",
            [nome ?? null, p, id]
        );
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
// DELETAR
app.delete("/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "id inválido" });
    try {
        const r = await pool.query("DELETE FROM produtos WHERE id = $1 RETURNING id", [id]);
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });
        res.status(204).end();
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
