const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(__dirname));

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fabricantes vindo de PRODUTOS (Opção B)
app.get('/fabricantes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT fabricante
      FROM produtos
      WHERE fabricante IS NOT NULL AND fabricante <> ''
      ORDER BY fabricante
    `);
    res.json(rows.map(r => r.fabricante));
  } catch (err) {
    console.error("ERRO /fabricantes:", err);
    res.status(500).send("Erro ao buscar fabricantes");
  }
});

// Buscar tudo
app.get('/produtos', async (req, res) => {
  try {
    const [produtos] = await pool.query('SELECT * FROM produtos ORDER BY id DESC');

    for (let prod of produtos) {
      const [historico] = await pool.query(
        `SELECT 
            id,
            fornecedor,
            fabricante,
            cor,
            data_compra as data,
            custo,
            qtd,
            numero_pedido
         FROM compras
         WHERE produto_id = ?
         ORDER BY data_compra DESC`,
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

// Criar Produto
app.post('/produtos', async (req, res) => {
  const { nome, categoria, fabricante } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO produtos (nome, categoria, fabricante) VALUES (?, ?, ?)',
      [nome, categoria || null, fabricante || null]
    );
    res.json({
      id: result.insertId,
      nome,
      categoria: categoria || '',
      fabricante: fabricante || '',
      historicoCompras: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar produto");
  }
});

// Nova Compra (COM cor)
app.post('/compras', async (req, res) => {
  const { produto_id, fornecedor, fabricante, cor, data, custo, qtd, numero_pedido } = req.body;

  try {
    await pool.execute(
      `INSERT INTO compras (produto_id, fornecedor, fabricante, cor, data_compra, custo, qtd, numero_pedido)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [produto_id, fornecedor, fabricante || null, cor || null, data, custo, qtd, numero_pedido || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar compra");
  }
});

// Deletar Produto
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

// Editar Produto
app.put('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, categoria, fabricante } = req.body;

  try {
    await pool.execute(
      'UPDATE produtos SET nome = ?, categoria = ?, fabricante = ? WHERE id = ?',
      [nome, categoria || null, fabricante || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar produto");
  }
});

// Editar Compra (COM cor)
app.put('/compras/:id', async (req, res) => {
  const { id } = req.params;
  const { fornecedor, fabricante, cor, data, custo, qtd, numero_pedido } = req.body;

  try {
    await pool.execute(
      `UPDATE compras
       SET fornecedor=?, fabricante=?, cor=?, data_compra=?, custo=?, qtd=?, numero_pedido=?
       WHERE id=?`,
      [fornecedor, fabricante || null, cor || null, data, custo, qtd, numero_pedido || null, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar compra");
  }
});

// Deletar Compra
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
