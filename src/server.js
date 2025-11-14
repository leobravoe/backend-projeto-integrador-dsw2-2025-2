import express from "express";
import cors from "cors";
import { pool } from "./database/db.js";

const app = express();

// Configura o back-end em modo permissivo
app.use(cors());

app.use(express.json());

app.get("/", async (_req, res) => {
    try {
        const rotas = {
            "LISTAR": "GET /api/chamados",
            "OBTER_UM": "GET /api/chamados/:id",
            "CRIAR": "POST /api/chamados BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'url_imagem'?: string }",
            "SUBSTITUIR": "PUT /api/chamados/:id BODY: { 'Usuarios_id': number, 'texto': string, 'estado': string, 'url_imagem'?: string }",
            "ATUALIZAR_PARCIAL": "PATCH /api/chamados/:id BODY: { 'Usuarios_id'?: number, 'texto'?: string, 'estado'?: string, 'url_imagem'?: string }",
            "DELETAR": "DELETE /api/chamados/:id",
        };
        res.json(rotas);
    } catch (error) {
        console.error("Erro na rota '/':", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.get("/api/chamados", async (_req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM "Chamados" ORDER BY "id" DESC`);
        res.json(rows);
    } catch (error) {
        console.error("Erro em GET /api/chamados:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.get("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        const { rows } = await pool.query(`SELECT * FROM "Chamados" WHERE "id" = $1`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(`Erro em GET /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.post("/api/chamados", async (req, res) => {
    const { Usuarios_id, texto, estado, url_imagem } = req.body ?? {};

    if (
        !Usuarios_id || !Number.isInteger(Usuarios_id) || Usuarios_id <= 0 ||
        !texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string"
    ) {
        return res.status(400).json({ erro: "Campos 'Usuarios_id' (inteiro > 0), 'texto' (string) e 'estado' (string) são obrigatórios." });
    }

    try {
        const { rows } = await pool.query(`
            INSERT INTO "Chamados" 
            ("Usuarios_id", "texto", "estado", "url_imagem") 
            VALUES 
            ($1, $2, $3, $4) 
            RETURNING *`,
            [Usuarios_id, texto, estado, url_imagem]
        );

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Erro em POST /api/chamados:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.put("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, url_imagem } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    if (
        !Usuarios_id || !Number.isInteger(Usuarios_id) || Usuarios_id <= 0 ||
        !texto || typeof texto !== "string" ||
        !estado || typeof estado !== "string" ||
        url_imagem === undefined
    ) {
        return res.status(400).json({ erro: "Corpo da requisição incompleto. Todos os campos são obrigatórios para substituição (PUT)." });
    }

    try {
        const { rows } = await pool.query(`
            UPDATE "Chamados" SET 
               "Usuarios_id" = $1, 
               "texto" = $2, 
               "estado" = $3, 
               "url_imagem" = $4
            WHERE "id" = $5
               RETURNING *`,
            [Usuarios_id, texto, estado, url_imagem, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(`Erro em PUT /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.patch("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { Usuarios_id, texto, estado, url_imagem } = req.body ?? {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    if (Object.keys(req.body ?? {}).length === 0) {
        return res.status(400).json({ erro: "É necessário enviar ao menos um campo para atualizar." });
    }

    if (Usuarios_id !== undefined && (!Number.isInteger(Usuarios_id) || Usuarios_id <= 0)) {
        return res.status(400).json({ erro: "Campo 'Usuarios_id' deve ser um inteiro positivo." });
    }

    try {
        const { rows } = await pool.query(`
            UPDATE "Chamados" SET 
                "Usuarios_id"   = COALESCE($1, "Usuarios_id"), 
                "texto"         = COALESCE($2, "texto"), 
                "estado"        = COALESCE($3, "estado"), 
                "url_imagem"     = COALESCE($4, "url_imagem")
            WHERE "id" = $5
            RETURNING *`,
            [Usuarios_id ?? null, texto ?? null, estado ?? null, url_imagem ?? null, id]
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

app.delete("/api/chamados/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "ID inválido" });
    }

    try {
        const result = await pool.query(`DELETE FROM "Chamados" WHERE "id" = $1`, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ erro: "Chamado não encontrado" });
        }

        res.status(204).end();
    } catch (error) {
        console.error(`Erro em DELETE /api/chamados/${id}:`, error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});