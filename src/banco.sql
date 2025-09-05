-- Descomente a linha abaixo se quiser garantir que o script possa ser executado várias vezes,
-- removendo as tabelas existentes antes de criá-las novamente.
DROP TABLE IF EXISTS Usuarios;
DROP TABLE IF EXISTS Chamados;

CREATE TABLE Usuarios (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    senha_hash      VARCHAR(255) NOT NULL,
    papel           SMALLINT NOT NULL CHECK (papel IN (0, 1)),
    dataCriacao     TIMESTAMP NOT NULL DEFAULT NOW(),
    dataAtualizacao TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE Chamados (
    id              SERIAL PRIMARY KEY,
    Usuarios_id     INTEGER NOT NULL REFERENCES Usuarios(id),
    texto           TEXT NOT NULL,
    estado          CHAR(1) NOT NULL CHECK (estado IN ('a', 'f')),
    urlImagem       VARCHAR(255) NULL,
    dataCriacao     TIMESTAMP NOT NULL DEFAULT NOW(),
    dataAtualizacao TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inserção de dados de exemplo para teste
INSERT INTO Usuarios (nome, email, senha_hash, papel, dataCriacao, dataAtualizacao)
VALUES ('Ana Souza', 'ana@exemplo.com', '$2a$10$exemploDeHashDeSenhaSegura', 0, '2025-08-20 14:30:00', '2025-08-20 15:10:00');

INSERT INTO Usuarios (nome, email, senha_hash, papel) VALUES
('Carlos Pereira', 'carlos.p@exemplo.com', '$2a$10$hashParaCarlosPereira', 1), -- Professor, ID será 2
('Beatriz Lima', 'bia.lima@exemplo.com', '$2a$10$hashParaBeatrizLima', 0),    -- Aluna, ID será 3
('Marcos Andrade', 'marcos.a@exemplo.com', '$2a$10$hashParaMarcosAndrade', 0), -- Aluno, ID será 4
('Fernanda Costa', 'fernanda.c@exemplo.com', '$2a$10$hashParaFernandaCosta', 1); -- Professora, ID será 5

INSERT INTO Chamados (Usuarios_id, texto, estado, urlImagem, dataCriacao, dataAtualizacao)
VALUES (1, 'Erro ao compilar', 'a', '/img/ícone.png', '2025-08-20 14:35:00', '2025-08-20 14:50:00');

-- Chamado da Ana Souza (ID do usuário: 1), já fechado
INSERT INTO Chamados (Usuarios_id, texto, estado)
VALUES (1, 'Não consigo encontrar o material da aula 5.', 'f');

-- Chamado da Beatriz Lima (ID do usuário: 3), aberto e sem imagem
INSERT INTO Chamados (Usuarios_id, texto, estado)
VALUES (3, 'O link para a biblioteca virtual está quebrado.', 'a');

-- Chamado do Marcos Andrade (ID do usuário: 4), aberto e com imagem
INSERT INTO Chamados (Usuarios_id, texto, estado, urlImagem)
VALUES (4, 'Recebendo erro 404 ao tentar acessar a página de exercícios.', 'a', '/img/erros/erro404_exercicios.jpg');

-- Outro chamado do Marcos Andrade (ID do usuário: 4), já fechado
INSERT INTO Chamados (Usuarios_id, texto, estado)
VALUES (4, 'Dúvida sobre o critério de avaliação do trabalho final.', 'f');

-- Chamado da Beatriz Lima (ID do usuário: 3), aberto
INSERT INTO Chamados (Usuarios_id, texto, estado)
VALUES (3, 'Qual é o prazo para a entrega do primeiro projeto?', 'a');

-- Chamado do professor Carlos Pereira (ID do usuário: 2), que também pode abrir chamados
INSERT INTO Chamados (Usuarios_id, texto, estado)
VALUES (2, 'Minha sala virtual não está aparecendo no painel principal.', 'a');