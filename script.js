let produtos = [];
const API_URL = "";

// --------- ABAS / MODAIS ----------
function fecharModal() {
  document.getElementById('modal-detalhes')?.classList.add('hidden');
}

function mostrarAba(aba) {
  document.getElementById('aba-cadastro').classList.add('hidden');
  document.getElementById('aba-entrada').classList.add('hidden');
  document.getElementById('btn-cadastro').classList.remove('active');
  document.getElementById('btn-entrada').classList.remove('active');

  document.getElementById(`aba-${aba}`).classList.remove('hidden');
  document.getElementById(`btn-${aba}`).classList.add('active');
}

function fecharModalEditar() {
  document.getElementById('modal-editar')?.classList.add('hidden');
}

function fecharModalEditarCompra() {
  document.getElementById('modal-editar-compra')?.classList.add('hidden');
  const idProd = document.getElementById('edit-compra-prod-id')?.value;
  if (idProd) verDetalhes(parseInt(idProd));
}

// --------- FABRICANTES (Opção B) ----------
async function carregarFabricantes() {
  const selects = [
    document.getElementById('entrada-fabricante'),
    document.getElementById('edit-compra-fabricante')
  ].filter(Boolean);

  if (selects.length === 0) return;

  try {
    const resp = await fetch(`${API_URL}/fabricantes`);
    if (!resp.ok) throw new Error(await resp.text());
    const lista = await resp.json();

    selects.forEach(sel => {
      sel.innerHTML = '<option value="">Selecione...</option>';
      if (!Array.isArray(lista) || lista.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "(nenhum fabricante cadastrado)";
        sel.appendChild(opt);
        return;
      }
      lista.forEach(fab => {
        const opt = document.createElement('option');
        opt.value = fab;
        opt.textContent = fab;
        sel.appendChild(opt);
      });
    });
  } catch (e) {
    console.error("Erro ao carregar fabricantes:", e);
    selects.forEach(sel => sel.innerHTML = '<option value="">(erro ao carregar)</option>');
  }
}

// --------- INIT ----------
async function init() {
  try {
    const resp = await fetch(`${API_URL}/produtos`);
    if (!resp.ok) throw new Error(await resp.text());
    produtos = await resp.json();

    atualizarSelectProdutos();
    renderizarTabela();
    await carregarFabricantes();
  } catch (e) {
    console.error("Falha init:", e);
    alert("Erro: Não foi possível carregar os produtos. Verifique se o servidor (Node.js) está rodando");
  }

  const modal = document.getElementById('modal-detalhes');
  window.onclick = function (event) {
    if (event.target === modal) fecharModal();
  };
}

function atualizarSelectProdutos() {
  const select = document.getElementById('entrada-produto');
  select.innerHTML = '<option value="">Selecione...</option>';
  produtos.forEach(prod => {
    const opt = document.createElement('option');
    opt.value = prod.id;
    opt.textContent = prod.nome;
    select.appendChild(opt);
  });
}

// --------- CADASTRO PRODUTO ----------
document.getElementById('form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-cat').value.trim();
  const fabricante = document.getElementById('prod-fab').value.trim();

  const resp = await fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, categoria, fabricante })
  });

  if (!resp.ok) {
    alert("Erro ao salvar produto: " + await resp.text());
    return;
  }

  e.target.reset();
  await init();
  alert("Produto salvo!");
});

// --------- REGISTRAR COMPRA (COM COR) ----------
document.getElementById('form-entrada').addEventListener('submit', async (e) => {
  e.preventDefault();

  const dados = {
    produto_id: parseInt(document.getElementById('entrada-produto').value),
    cor: (document.getElementById('entrada-cor').value || "").trim(),
    fornecedor: document.getElementById('entrada-fornecedor').value.trim(),
    fabricante: document.getElementById('entrada-fabricante').value,
    data: document.getElementById('entrada-data').value,
    custo: parseFloat(document.getElementById('entrada-custo').value),
    qtd: parseInt(document.getElementById('entrada-qtd').value),
    numero_pedido: (document.getElementById('entrada-pedido').value || "").trim()
  };

  const resp = await fetch(`${API_URL}/compras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  if (!resp.ok) {
    alert("Erro ao registrar compra: " + await resp.text());
    return;
  }

  e.target.reset();
  await init();
  alert("Entrada registrada!");
});

// --------- TABELA ESTOQUE ----------
function renderizarTabela() {
  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';

  produtos.forEach(prod => {
    let qtdTotal = 0;
    let custoTotal = 0;

    (prod.historicoCompras || []).forEach(c => {
      qtdTotal += Number(c.qtd || 0);
      custoTotal += (Number(c.custo || 0) * Number(c.qtd || 0));
    });

    const custoMedio = qtdTotal ? (custoTotal / qtdTotal).toFixed(2) : "0.00";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.categoria || '-'}</td>
      <td>${prod.fabricante || '-'}</td>
      <td><strong>${qtdTotal}</strong> un</td>
      <td>R$ ${custoMedio}</td>
      <td class="acoes-btn">
        <button class="btn-acao btn-ver" data-prod-id="${prod.id}" title="Ver Histórico">📄</button>
        <button class="btn-acao btn-editar" onclick="abrirModalEditar(${prod.id})" title="Editar">✏️</button>
        <button class="btn-acao btn-deletar" onclick="deletarProduto(${prod.id})" title="Excluir">🗑️</button>
      </td>
    `;

    tr.querySelector('.btn-ver').addEventListener('click', () => verDetalhes(prod.id));
    tbody.appendChild(tr);
  });
}

// --------- HISTÓRICO (COM COR) ----------
function verDetalhes(idProduto) {
  const produto = produtos.find(p => p.id === idProduto);
  const modal = document.getElementById('modal-detalhes');
  const tbody = document.querySelector('#tabela-historico tbody');

  document.getElementById('modal-titulo').innerText = `Histórico: ${produto.nome}`;
  tbody.innerHTML = '';

  const hist = produto.historicoCompras || [];

  if (hist.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sem histórico.</td></tr>';
  } else {
    hist.forEach(compra => {
      const tr = document.createElement('tr');

      const dataISO = String(compra.data).split('T')[0];
      const dataFormatada = new Date(compra.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${compra.fornecedor || '-'}</td>
        <td>${compra.fabricante || '-'}</td>
        <td>${compra.cor || '-'}</td>
        <td>R$ ${Number(compra.custo || 0).toFixed(2)}</td>
        <td>${compra.qtd}</td>
        <td>${compra.numero_pedido || '-'}</td>
        <td style="display:flex; gap:5px;">
          <button class="btn-acao btn-editar" title="Editar">✏️</button>
          <button class="btn-acao btn-deletar" title="Excluir">🗑️</button>
        </td>
      `;

      // ✅ dataset: sem risco de quebrar string
      const btnEditar = tr.querySelector('.btn-editar');
      btnEditar.dataset.compraId = compra.id;
      btnEditar.dataset.produtoId = produto.id;
      btnEditar.dataset.fornecedor = compra.fornecedor || '';
      btnEditar.dataset.fabricante = compra.fabricante || '';
      btnEditar.dataset.cor = compra.cor || '';
      btnEditar.dataset.data = dataISO;
      btnEditar.dataset.custo = compra.custo;
      btnEditar.dataset.qtd = compra.qtd;
      btnEditar.dataset.pedido = compra.numero_pedido || '';

      btnEditar.addEventListener('click', (ev) => abrirModalEditarCompra(ev.currentTarget.dataset));
      tr.querySelector('.btn-deletar').addEventListener('click', () => deletarCompra(compra.id, produto.id));

      tbody.appendChild(tr);
    });
  }

  modal.classList.remove('hidden');
}

// --------- EDITAR PRODUTO ----------
function abrirModalEditar(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  document.getElementById('edit-id').value = produto.id;
  document.getElementById('edit-nome').value = produto.nome;
  document.getElementById('edit-categoria').value = produto.categoria || '';
  document.getElementById('edit-fabricante').value = produto.fabricante || '';

  document.getElementById('modal-editar').classList.remove('hidden');
}

document.getElementById('form-editar').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = parseInt(document.getElementById('edit-id').value);
  const nome = document.getElementById('edit-nome').value.trim();
  const categoria = document.getElementById('edit-categoria').value.trim();
  const fabricante = document.getElementById('edit-fabricante').value.trim();

  const resp = await fetch(`${API_URL}/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, categoria, fabricante })
  });

  if (!resp.ok) {
    alert("Erro ao editar produto: " + await resp.text());
    return;
  }

  fecharModalEditar();
  await init();
  alert("Produto atualizado!");
});

// --------- EDITAR COMPRA (COM COR) ----------
function abrirModalEditarCompra(ds) {
  document.getElementById('edit-compra-id').value = ds.compraId;
  document.getElementById('edit-compra-prod-id').value = ds.produtoId;

  document.getElementById('edit-compra-fornecedor').value = ds.fornecedor || '';
  document.getElementById('edit-compra-data').value = ds.data || '';
  document.getElementById('edit-compra-custo').value = ds.custo || 0;
  document.getElementById('edit-compra-qtd').value = ds.qtd || 0;
  document.getElementById('edit-compra-pedido').value = ds.pedido || '';
  document.getElementById('edit-compra-cor').value = ds.cor || '';

  const selFab = document.getElementById('edit-compra-fabricante');
  if (selFab) {
    // se não existir na lista, injeta opção
    const val = ds.fabricante || '';
    const exists = Array.from(selFab.options).some(o => o.value === val);
    if (val && !exists) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      selFab.appendChild(opt);
    }
    selFab.value = val;
  }

  document.getElementById('modal-detalhes').classList.add('hidden');
  document.getElementById('modal-editar-compra').classList.remove('hidden');
}

document.getElementById('form-editar-compra').addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCompra = document.getElementById('edit-compra-id').value;
  const idProduto = parseInt(document.getElementById('edit-compra-prod-id').value);

  const dados = {
    fornecedor: document.getElementById('edit-compra-fornecedor').value.trim(),
    fabricante: document.getElementById('edit-compra-fabricante').value,
    cor: (document.getElementById('edit-compra-cor').value || "").trim(),
    data: document.getElementById('edit-compra-data').value,
    custo: parseFloat(document.getElementById('edit-compra-custo').value),
    qtd: parseInt(document.getElementById('edit-compra-qtd').value),
    numero_pedido: (document.getElementById('edit-compra-pedido').value || "").trim()
  };

  const resp = await fetch(`${API_URL}/compras/${idCompra}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });

  if (!resp.ok) {
    alert("Erro ao salvar edição: " + await resp.text());
    return;
  }

  document.getElementById('modal-editar-compra').classList.add('hidden');
  await init();
  verDetalhes(idProduto);
  alert("Compra atualizada!");
});

// --------- DELETE ----------
async function deletarCompra(idCompra, idProduto) {
  if (!confirm("Deseja excluir este lançamento?")) return;

  const resp = await fetch(`${API_URL}/compras/${idCompra}`, { method: 'DELETE' });
  if (!resp.ok) {
    alert("Erro ao excluir: " + await resp.text());
    return;
  }

  await init();
  verDetalhes(idProduto);
}

async function deletarProduto(id) {
  if (!confirm("ATENÇÃO: Isso apagará o produto e todo o histórico. Continuar?")) return;

  const resp = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
  if (!resp.ok) {
    alert("Erro ao excluir: " + await resp.text());
    return;
  }

  await init();
}

// --------- EXCEL (se quiser, eu ajusto depois para incluir cor também) ----------
function exportarParaExcel() {
  alert("Se quiser, eu ajusto o Excel pra incluir a coluna Cor também.");
}

document.addEventListener('DOMContentLoaded', init);
