// server.js
// -----------------------------------------------------------------------------
// OBJETIVO DO ARQUIVO
// -----------------------------------------------------------------------------
// Este arquivo expõe uma API REST simples para um sistema de "chamados",
// utilizando as seguintes tecnologias:
// - Express.js: Framework para criação de servidores HTTP em Node.js.
// - PostgreSQL: Acesso ao banco de dados via pool de conexões (./db.js).
//
// COMO LER ESTE CÓDIGO (PARA INICIANTES):
// - Linhas que começam com // são comentários e não são executadas.
// - "async/await" gerencia operações assíncronas (ex.: acesso ao banco).
// - Em cada rota, "req" representa a requisição do cliente e "res" a resposta
//   que o servidor enviará.
// - No final, app.listen(PORT) efetivamente inicia o servidor.
//
// CÓDIGOS DE STATUS HTTP UTILIZADOS:
// - 200 OK          → Requisição bem-sucedida (geralmente com dados no corpo).
// - 201 Created     → Recurso criado com sucesso (retorna o novo recurso).
// - 204 No Content  → Operação bem-sucedida, sem corpo na resposta (ex.: DELETE).
// - 400 Bad Request → Requisição inválida por parte do cliente (ex.: ID negativo).
// - 404 Not Found   → O recurso solicitado não foi encontrado no servidor.
// - 500 Internal Server Error → Erro inesperado no servidor.
//
// NOTAS DE SEGURANÇA (SQL):
// - Utilizamos "queries parametrizadas" ($1, $2, ...) para prevenir SQL Injection.
//   Exemplo: pool.query("SELECT * FROM chamados WHERE id = $1", [id]);
// - Nunca concatene valores do usuário diretamente em uma string de SQL.
//
// NOTAS SOBRE O FORMATO JSON:
// - app.use(express.json()) é um "middleware" que interpreta o corpo (body) de
//   requisições com formato JSON, tornando-o acessível em `req.body`.
//   Sem ele, `req.body` seria `undefined`.
//
// -----------------------------------------------------------------------------
// IMPORTAÇÕES E CONFIGURAÇÃO INICIAL
// -----------------------------------------------------------------------------
import express from "express";
import { pool } from "./db.js"; // "pool" gerencia as conexões com o PostgreSQL

const app = express();

// Middleware que transforma o corpo (body) de requisições JSON em um objeto JS.
app.use(express.json());

// -----------------------------------------------------------------------------
// ROTA DE BOAS-VINDAS / DOCUMENTAÇÃO RÁPIDA (GET /)
// -----------------------------------------------------------------------------
// Esta rota serve como uma "página inicial" da API, listando os endpoints
// disponíveis em formato JSON para facilitar testes e desenvolvimento.
app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /api/chamados",
            "OBTER_UM": "GET /api/chamados/:id",
            "CRIAR": "POST /api/chamados BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'urlImagem'?: string }",
            "SUBSTITUIR": "PUT /api/chamados/:id BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'urlImagem'?: string }",
            "ATUALIZAR_PARCIAL": "PATCH /api/chamados/:id BODY: { 'Usuarios_id'?: number, 'texto'?: string, 'estado'?: string, 'urlImagem'?: string }",
            "DELETAR": "DELETE /api/chamados/:id",
        };
        // Envia o objeto de rotas como JSON (status 200 é o padrão).
        res.json(rotas);
    } catch (error) {
        // Em um ambiente de produção, é crucial registrar (fazer log) do erro.
        console.error("Erro na rota '/':", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// LISTAR TODOS OS CHAMADOS (GET /api/chamados)
// -----------------------------------------------------------------------------
// Objetivo: Retornar uma lista de todos os chamados, ordenados do mais
// recente para o mais antigo (por ID).
app.get("/api/chamados", async (_req, res) => {
    try {
        // A desestruturação { rows } extrai diretamente o array de resultados.
        const { rows } = await pool.query("SELECT * FROM chamados ORDER BY id DESC");
        res.json(rows); // Retorna o array de chamados.
    } catch (error) {
        console.error("Erro em GET /api/chamados:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// OBTER UM CHAMADO ESPECÍFICO (GET /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: Buscar um único chamado pelo seu ID.
// Lembrete: Parâmetros de rota (ex: :id) são sempre recebidos como strings.
app.get("/api/chamados/:id", async (req, res) => {
    // Converte o parâmetro `id` da URL para um número.
    const id = Number(req.params.id);

    // Validação de entrada: Garante que o ID seja um número inteiro positivo.
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        // Query parametrizada: o valor de `id` substitui `$1` de forma segura.
        const { rows } = await pool.query("SELECT * FROM chamados WHERE id = $1", [id]);

        // Se o array `rows` estiver vazio, o chamado não foi encontrado.
        if (rows.length === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        // Retorna o primeiro (e único) resultado encontrado.
        res.json(rows[0]);
    } catch (error) {
        console.error(`Erro em GET /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// CRIAR UM NOVO CHAMADO (POST /api/chamados)
// -----------------------------------------------------------------------------
// Objetivo: Inserir um novo chamado no banco de dados.
// Espera um corpo JSON com: { Usuarios_id, texto, estado, urlImagem? }
app.post("/api/chamados", async (req, res) => {
    // `?? {}` previne erro caso o cliente não envie um corpo (body).
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

    // Validação dos campos obrigatórios e seus tipos.
    if (
        !Usuarios_id || !Number.isInteger(Usuarios_id) || Usuarios_id <= 0 ||
        !texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string"
    ) {
        return res.status(400).json({ erro: "Campos 'Usuarios_id' (inteiro > 0), 'texto' (string) e 'estado' (string) são obrigatórios." });
    }

    try {
        // `RETURNING *` faz com que o PostgreSQL retorne a linha recém-inserida.
        const { rows } = await pool.query(
            "INSERT INTO chamados (Usuarios_id, texto, estado, urlImagem) VALUES ($1, $2, $3, $4) RETURNING *",
            [Usuarios_id, texto, estado, urlImagem] // `urlImagem` pode ser null
        );

        // `rows[0]` contém o objeto do chamado criado.
        res.status(201).json(rows[0]); // Status 201: Created.
    } catch (error) {
        console.error("Erro em POST /api/chamados:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// SUBSTITUIR UM CHAMADO (PUT /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: Substituir TODOS os campos de um chamado existente.
// Requer um corpo JSON completo: { Usuarios_id, texto, estado, urlImagem }.
app.put("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

    // Validação do ID na URL.
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    // Validação dos campos no corpo da requisição (todos obrigatórios para PUT).
    if (
        !Usuarios_id || !Number.isInteger(Usuarios_id) || Usuarios_id <= 0 ||
        !texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string" ||
        urlImagem === undefined // Permite `null`, mas não `undefined`.
    ) {
        return res.status(400).json({ erro: "Corpo da requisição incompleto. Todos os campos são obrigatórios para substituição (PUT)." });
    }

    try {
        const { rows } = await pool.query(
            `UPDATE chamados 
             SET Usuarios_id = $1, texto = $2, estado = $3, urlImagem = $4
             WHERE id = $5
             RETURNING *`,
            [Usuarios_id, texto, estado, urlImagem, id]
        );

        // Se a query não retornou linhas, o ID não foi encontrado.
        if (rows.length === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        res.json(rows[0]); // Retorna o chamado com os dados atualizados.
    } catch (error) {
        console.error(`Erro em PUT /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// ATUALIZAR UM CHAMADO PARCIALMENTE (PATCH /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: Atualizar APENAS os campos enviados no corpo da requisição.
// Estratégia: No SQL, COALESCE(valor_novo, valor_antigo) usa o valor novo
// se ele não for NULL; caso contrário, mantém o valor que já estava no banco.
app.patch("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, urlImagem } = req.body ?? {};

    // Validação do ID.
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    // Se o corpo da requisição estiver vazio, não há o que atualizar.
    if (Object.keys(req.body ?? {}).length === 0) {
        return res.status(400).json({ erro: "É necessário enviar ao menos um campo para atualizar." });
    }

    // Validação condicional dos campos, apenas se eles foram fornecidos.
    if (Usuarios_id !== undefined && (!Number.isInteger(Usuarios_id) || Usuarios_id <= 0)) {
        return res.status(400).json({ erro: "Campo 'Usuarios_id' deve ser um inteiro positivo." });
    }

    try {
        // Mapeia os valores para `null` se forem `undefined` para o COALESCE funcionar.
        const { rows } = await pool.query(
            `UPDATE chamados
             SET 
                 Usuarios_id = COALESCE($1, Usuarios_id), 
                 texto         = COALESCE($2, texto), 
                 estado        = COALESCE($3, estado), 
                 urlImagem     = COALESCE($4, urlImagem)
             WHERE id = $5
             RETURNING *`,
            [Usuarios_id ?? null, texto ?? null, estado ?? null, urlImagem ?? null, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(`Erro em PATCH /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// DELETAR UM CHAMADO (DELETE /api/chamados/:id)
// -----------------------------------------------------------------------------
// Objetivo: Remover um chamado do banco de dados pelo seu ID.
// Retorno em caso de sucesso: 204 No Content (sem corpo na resposta).
app.delete("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        // `rowCount` informa quantas linhas foram afetadas pelo comando.
        const result = await pool.query("DELETE FROM chamados WHERE id = $1", [id]);

        // Se nenhuma linha foi afetada, o ID não existia.
        if (result.rowCount === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        // Sucesso: envia o status 204 e finaliza a resposta.
        res.status(204).end();
    } catch (error) {
        console.error(`Erro em DELETE /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// -----------------------------------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------
// A porta é obtida da variável de ambiente `PORT` ou assume `3000` como padrão.
const PORT = process.env.PORT || 3000;

// Inicia o servidor HTTP, que passará a aguardar requisições na porta definida.
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    // Abra o link acima no navegador para testar a rota "/".
});