import express from "express";
import cors from "cors";
import usuariosRoutes from "./routes/usuarios.routes.js";
import chamadosRoutes from "./routes/chamados.routes.js";

const app = express();

// Configura o back-end em modo permissivo
app.use(cors());

app.use(express.json());

// configura as rotas de usuário
app.use("/api/usuarios", usuariosRoutes);
// configura as rotas de usuário
app.use("/api/chamados", chamadosRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});