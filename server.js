const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path'); // Importante para caminhos de arquivo

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- CORREÇÃO DO ERRO "Cannot GET /" ---
// Esta linha diz ao servidor para mostrar o index.html, style.css e script.js
app.use(express.static(__dirname)); 

// =========================================================
// 1. CONFIGURAÇÃO DO BANCO DE DADOS
// =========================================================
let pool;

if (process.env.JAWSDB_URL) {
    console.log("Conectando ao banco do Heroku...");
    pool = mysql.createPool(process.env.JAWSDB_URL);
} else {
    console.log("Conectando ao banco Local...");
    pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '123456abc', 
        database: 'controle_estoque',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

// =========================================================
// 2. ROTAS DA API
// =========================================================

// Rota para garantir que o index.html seja carregado na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota 1: Buscar tudo
app.get('/produtos', async (req, res) => {
    try {
        const [produtos] = await pool.query('SELECT * FROM produtos ORDER BY id DESC');
        for (let prod of produtos) {
            const [historico] = await pool.query(
                'SELECT id, fornecedor, data_compra as data, custo, qtd, numero_pedido FROM compras WHERE produto_id = ? ORDER BY data_compra DESC',
                [prod.id]
            );
            prod.historicoCompras = historico.map(h => ({ ...h, custo: parseFloat(h.custo) }));
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
        const [result] = await pool.execute('INSERT INTO produtos (nome, categoria) VALUES (?, ?)', [nome, categoria]);
        res.json({ id: result.insertId, nome, categoria, historicoCompras: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar produto");
    }
});

// Rota 3: Nova Compra
app.post('/compras', async (req, res) => {
    const { produto_id, fornecedor, data, custo, qtd, numero_pedido } = req.body;
    try {
        await pool.execute('INSERT INTO compras (produto_id, fornecedor, data_compra, custo, qtd, numero_pedido) VALUES (?, ?, ?, ?, ?, ?)', [produto_id, fornecedor, data, custo, qtd, numero_pedido]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar compra");
    }
});

// Rota 4: Deletar Produto
app.delete('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM compras WHERE produto_id = ?', [id]);
        const [result] = await pool.execute('DELETE FROM produtos WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Produto não encontrado." });
        res.json({ success: true });
    } catch (err) {
        console.error("ERRO:", err);
        res.status(500).json({ error: err.message });
    }
});

// Rota 5: Editar Produto
app.put('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria } = req.body;
    try {
        await pool.execute('UPDATE produtos SET nome = ?, categoria = ? WHERE id = ?', [nome, categoria, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao atualizar produto");
    }
});

// Rota 6: Editar Compra
app.put('/compras/:id', async (req, res) => {
    const { id } = req.params;
    const { fornecedor, data, custo, qtd, numero_pedido } = req.body;
    try {
        await pool.execute('UPDATE compras SET fornecedor=?, data_compra=?, custo=?, qtd=?, numero_pedido=? WHERE id=?', [fornecedor, data, custo, qtd, numero_pedido, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao atualizar compra");
    }
});

// Rota 7: Deletar Compra
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

// =========================================================
// 3. INICIALIZAÇÃO
// =========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});