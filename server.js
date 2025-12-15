const express = require('express');
const mysql = require('mysql2/promise'); // Usando a versão com Promises
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// CONFIGURAÇÃO DO BANCO DE DADOS MYSQL
// ATENÇÃO: Troque 'sua_senha' pela senha real do seu MySQL (geralmente vazia no XAMPP)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456abc', 
    database: 'controle_estoque',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Rota 1: Buscar tudo (CORRIGIDA: Agora traz o ID da compra)
app.get('/produtos', async (req, res) => {
    try {
        const [produtos] = await pool.query('SELECT * FROM produtos ORDER BY id DESC');

        for (let prod of produtos) {
            // --- AQUI ESTAVA O ERRO ---
            // Adicionei "id," logo no começo do SELECT abaixo
            const [historico] = await pool.query(
                'SELECT id, fornecedor, data_compra as data, custo, qtd, numero_pedido FROM compras WHERE produto_id = ? ORDER BY data_compra DESC',
                [prod.id]
            );
            
            prod.historicoCompras = historico.map(h => ({
                ...h,
                custo: parseFloat(h.custo) 
            }));
        }

        res.json(produtos);
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro no servidor");
    }
});

// Rota 2: Criar Produto
app.post('/produtos', async (req, res) => {
    const { nome, categoria } = req.body;
    try {
        // No MySQL usamos '?' como placeholder
        const [result] = await pool.execute(
            'INSERT INTO produtos (nome, categoria) VALUES (?, ?)',
            [nome, categoria]
        );
        
        // No MySQL, o ID gerado vem em result.insertId
        res.json({ 
            id: result.insertId, 
            nome, 
            categoria, 
            historicoCompras: [] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar produto");
    }
});

// Rota 3: Nova Compra (Entrada)
app.post('/compras', async (req, res) => {
    // ADICIONADO: numero_pedido no corpo da requisição
    const { produto_id, fornecedor, data, custo, qtd, numero_pedido } = req.body;
    try {
        await pool.execute(
            'INSERT INTO compras (produto_id, fornecedor, data_compra, custo, qtd, numero_pedido) VALUES (?, ?, ?, ?, ?, ?)',
            [produto_id, fornecedor, data, custo, qtd, numero_pedido]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar compra");
    }
});

app.listen(process.env.PORT ||3000, () => {
    console.log('Servidor rodando');
});

// Rota 4: DELETAR Produto (e seu histórico)
app.delete('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection(); // Pega conexão para garantir transação
    try {
        await connection.beginTransaction();

        // 1. Deleta todo o histórico desse produto
        await connection.execute('DELETE FROM compras WHERE produto_id = ?', [id]);
        
        // 2. Deleta o produto
        await connection.execute('DELETE FROM produtos WHERE id = ?', [id]);

        await connection.commit(); // Confirma
        res.json({ success: true });
    } catch (err) {
        await connection.rollback(); // Cancela se der erro
        console.error("Erro ao deletar:", err);
        res.status(500).send("Erro ao deletar produto. Verifique o console.");
    } finally {
        connection.release();
    }
});

// Rota 5: EDITAR Produto
app.put('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria } = req.body;
    try {
        await pool.execute(
            'UPDATE produtos SET nome = ?, categoria = ? WHERE id = ?',
            [nome, categoria, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao atualizar produto");
    }
});
// Rota 6: EDITAR UMA COMPRA ESPECÍFICA
app.put('/compras/:id', async (req, res) => {
    const { id } = req.params;
    const { fornecedor, data, custo, qtd, numero_pedido } = req.body;
    try {
        await pool.execute(
            'UPDATE compras SET fornecedor=?, data_compra=?, custo=?, qtd=?, numero_pedido=? WHERE id=?',
            [fornecedor, data, custo, qtd, numero_pedido, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao atualizar compra");
    }
});
// Rota 7: DELETAR UMA COMPRA ESPECÍFICA
app.delete('/compras/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM compras WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao deletar compra");
    }
});