// O objetivo deste arquivo é criar a variável pool
// e colocar dentro dela a conexão com o postgres
// Estamos assim criando um mini pacote
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
});

export { pool };
