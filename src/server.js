// server.js
// -----------------------------------------------------------------------------
// OBJETIVO DESTE ARQUIVO
// -----------------------------------------------------------------------------
// Este arquivo expõe uma pequena API REST de "chamados" utilizando:
// - Express (framework HTTP para Node.js)
// - PostgreSQL (acesso via pool de conexões importado de ./db.js)
//
// COMO LER ESTE CÓDIGO (para iniciantes):
// - Tudo que começa com // é comentário e NÃO é executado.
// - "async/await" indica operações assíncronas (ex.: acessar o banco).
// - Em rotas, "req" é o pedido do cliente; "res" é a resposta do servidor.
// - No fim, app.listen(PORT) inicia o servidor HTTP.
//
// CÓDIGOS DE STATUS HTTP UTILIZADOS:
// - 200 OK               → requisição concluída com sucesso (retorna dados).
// - 201 Created          → criação de recurso concluída (retorna o criado).
// - 204 No Content       → operação bem-sucedida, sem corpo na resposta (ex.: DELETE).
// - 400 Bad Request      → dados inválidos enviados pelo cliente (ex.: id negativo).
// - 404 Not Found        → recurso não encontrado (ex.: chamado inexistente).
// - 500 Internal Server Error → erro inesperado no servidor.
//
// SOBRE SEGURANÇA E SQL:
// - Sempre usamos "queries parametrizadas" com $1, $2 etc. para evitar SQL Injection.
//   Ex.: pool.query("SELECT ... WHERE id = $1", [id])
// - Nunca concatene valores vindos do usuário diretamente em strings de SQL.
//
// SOBRE JSON:
// - app.use(express.json()) faz o Express interpretar JSON no corpo da requisição
//   (req.body). Sem isso, req.body seria undefined para requisições com JSON.
//
// -----------------------------------------------------------------------------
// IMPORTAÇÕES E CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
import express from "express";
import { pool } from "./db.js"; // "pool" gerencia conexões com o PostgreSQL
const app = express();

app.use(express.json());
// ^ Middleware que transforma JSON recebido no body em objeto JS (req.body).
//   Sem isso, req.body seria undefined em requisições com JSON.

// -----------------------------------------------------------------------------
// ROTA DE BOAS-VINDAS / DOCUMENTAÇÃO RÁPIDA (GET /)
// -----------------------------------------------------------------------------
// Esta rota lista, em JSON, as rotas disponíveis.
// Útil como "home" da API para testes rápidos no navegador.
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /api/chamados",
            "MOSTRAR": "GET /api/chamados/:id",
            "CRIAR": "POST /api/chamados BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'urlImagem'?: string }",
            "SUBSTITUIR": "PUT /api/chamados/:id BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'urlImagem'?: string }",
            "ATUALIZAR": "PATCH /api/chamados/:id BODY: { 'Usuarios_id': number || 'texto': string || 'estado': string || 'urlImagem'?: string }",
            "DELETAR": "DELETE /api/chamados/:id",
        };
        res.json(rotas); // Envia um objeto JS como JSON (status 200 por padrão)
    } catch {
        // Em produção, normalmente também registramos (logamos) o erro para análise.
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// LISTAR TODOS (GET /api/chamados)
// -----------------------------------------------------------------------------
// Objetivo: retornar todos os chamados em ordem decrescente de id.
// Observação: pool.query retorna um objeto; a propriedade "rows" contém as linhas.
app.get("/api/chamados", async (_req, res) => {
    try {
        // Desestruturação para extrair apenas "rows" do resultado.
        const { rows } = await pool.query("SELECT * FROM chamados ORDER BY id DESC");
        res.json(rows); // retorna array de chamados (objetos)
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// MOSTRAR UM (GET /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: buscar UM chamado específico pelo id.
// Dica: parâmetros de rota (":id") chegam como string; converta para número.
app.get("/api/chamados/:id", async (req, res) => {
    // req.params.id é SEMPRE string; convertemos com Number(...)
    const id = Number(req.params.id);

    // Validação do "id":
    // - Number.isInteger(id): garante inteiro (NaN falha aqui).
    // - id <= 0: rejeita zero e negativos.
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        // Consulta parametrizada: $1 substituído por "id".
        const result = await pool.query("SELECT * FROM chamados WHERE id = $1", [id]);
        const { rows } = result;
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        // Achou: devolvemos o registro.
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// CRIAR (POST /api/chamados)
// -----------------------------------------------------------------------------
// Objetivo: inserir um novo chamado. Espera JSON com:
// { Usuarios_id: number, texto: string, estado: string, urlImagem?: string }
//
// Observações:
// - req.body pode ser undefined se o cliente não enviar JSON; usamos "?? {}"
//   para garantir objeto vazio ao desestruturar (evita erro).
app.post("/api/chamados", async (req, res) => {
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
    const uId = Number(Usuarios_id);

    // Validação mínima de tipos e obrigatoriedade.
    if (!texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string" ||
        !urlImagem || typeof urlImagem !== "string" ||
        Usuarios_id == null || Number.isNaN(uId) || uId < 1
    ) {
        return res.status(400).json({ erro: "Texto, estado, urlImagem precisam ser strings não vazias. Usuarios_id precisa ser um número inteiro > 0." });
    }

    try {
        // INSERT com retorno: RETURNING * devolve a linha criada.
        const { rows } = await pool.query(
            "INSERT INTO chamados (Usuarios_id, texto, estado, urlImagem) VALUES ($1, $2, $3, $4) RETURNING *",
            [Usuarios_id, texto, estado, urlImagem]
        );

        // rows[0] contém o chamado recém-inserido.
        res.status(201).json(rows[0]); // 201 Created
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// SUBSTITUIR (PUT /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: substituir TODOS os campos do chamado (PUT = envia o recurso completo).
// Requer: { Usuarios_id, texto, estado, urlImagem } válidos.
app.put("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};
    const uId = Number(Usuarios_id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    if (!texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string" ||
        !urlImagem || typeof urlImagem !== "string" ||
        Usuarios_id == null || Number.isNaN(uId) || uId < 1
    ) {
        return res.status(400).json({ erro: "Texto, estado, urlImagem precisam ser strings não vazias. Usuarios_id precisa ser um número inteiro > 0." });
    }

    try {
        // Atualiza sempre todos os campos (não mantém valores antigos).
        const { rows } = await pool.query(
            `UPDATE chamados SET 
                 Usuarios_id = $1, 
                 texto = $2,
                 estado = $3,
                 urlImagem = $4
             WHERE id = $5
             RETURNING *`,
            [Usuarios_id, texto, estado, urlImagem, id]
        );

        // Se nenhuma linha foi atualizada, o id não existia.
        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });

        res.json(rows[0]); // retorna o chamado atualizado
    } catch {
        res.status(500).json({ erro: "erro interno"});
    }
});

// -----------------------------------------------------------------------------
// ATUALIZAR PARCIALMENTE (PATCH /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: atualizar APENAS os campos enviados.
// Regras:
// - Se um campo não for enviado, mantemos o valor atual.
// - Estratégia: enviar NULL para campos ausentes e usar COALESCE no SQL.
//   COALESCE(a, b) → devolve "a" quando "a" não é NULL; senão, devolve "b".
app.patch("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

    // Validação do id
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    // Se nada foi enviado, não há o que atualizar.
    if (Usuarios_id === undefined &&
        texto === undefined &&
        estado === undefined &&
        urlImagem === undefined
    ) {
        return res.status(400).json({ erro: "É necessário enviar ao menos um campo para atualizar." });
    }

    // Validação condicional de Usuarios_id, se vier.
    let uId = null;
    if (Usuarios_id !== undefined) {
        uId = Number(Usuarios_id);
        if (Number.isNaN(uId) || uId < 1) {
            return res.status(400).json({ erro: "Usuarios_id deve ser um inteiro > 0." });
        }
    }

    try {
        // Para cada campo, se não vier (undefined), passamos null e o COALESCE mantém o valor atual.
        const { rows } = await pool.query(
            `UPDATE chamados SET 
              Usuarios_id = COALESCE($1, Usuarios_id), 
              texto       = COALESCE($2, texto), 
              estado      = COALESCE($3, estado), 
              urlImagem   = COALESCE($4, urlImagem)
            WHERE id = $5
            RETURNING *`,
            [Usuarios_id ?? null, texto ?? null, estado ?? null, urlImagem ?? null, id]
        );

        if (!rows[0]) return res.status(404).json({ erro: "não encontrado" });
        res.json(rows[0]);
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// DELETAR (DELETE /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: remover um chamado existente.
// Retorno: 204 No Content quando der certo (sem corpo na resposta).
app.delete("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "id inválido" });
    }

    try {
        // RETURNING id permite saber se algo foi realmente deletado.
        const r = await pool.query("DELETE FROM chamados WHERE id = $1 RETURNING id", [id]);

        // r.rowCount indica número de linhas afetadas (0 = id inexistente).
        if (!r.rowCount) return res.status(404).json({ erro: "não encontrado" });

        res.status(204).end(); // 204 = sucesso sem corpo de resposta
    } catch {
        res.status(500).json({ erro: "erro interno" });
    }
});

// -----------------------------------------------------------------------------
// SUBIR O SERVIDOR
// -----------------------------------------------------------------------------
// process.env.PORT permite customizar a porta via variável de ambiente.
// Se não houver, usamos 3000 como padrão.
const PORT = process.env.PORT || 3000;

// app.listen inicia o servidor HTTP e fica “escutando” requisições.
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
// Abra este link no navegador para visualizar a rota "/".
