let produtos = [];
const API_URL = "";

// --------- MODAIS ----------
function fecharModal() {
  const modal = document.getElementById('modal-detalhes');
  if (modal) modal.classList.add('hidden');
}

function mostrarAba(aba) {
  document.getElementById('aba-cadastro').classList.add('hidden');
  document.getElementById('aba-entrada').classList.add('hidden');
  document.getElementById('btn-cadastro').classList.remove('active');
  document.getElementById('btn-entrada').classList.remove('active');

  document.getElementById(`aba-${aba}`).classList.remove('hidden');
  document.getElementById(`btn-${aba}`).classList.add('active');
}

// --------- FABRICANTES (Opção B: vem de produtos) ----------
async function carregarFabricantes() {
  const selects = [
    document.getElementById('entrada-fabricante'),
    document.getElementById('edit-compra-fabricante')
  ].filter(Boolean);

  if (selects.length === 0) return;

  try {
    const resp = await fetch(`${API_URL}/fabricantes`);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${txt}`);
    }

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
    selects.forEach(sel => {
      sel.innerHTML = '<option value="">(erro ao carregar)</option>';
    });
  }
}

// --------- INIT ----------
async function init() {
  try {
    const response = await fetch(`${API_URL}/produtos`);
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`HTTP ${response.status}: ${txt}`);
    }

    produtos = await response.json();

    atualizarSelectProdutos();
    renderizarTabela();
    await carregarFabricantes();
  } catch (error) {
    console.error("Falha ao carregar produtos:", error);
    alert("Erro: Não foi possível carregar os produtos. Verifique se o servidor (Node.js) está rodando.");
  }

  const modal = document.getElementById('modal-detalhes');
  window.onclick = function (event) {
    if (event.target == modal) fecharModal();
  };
}

function atualizarSelectProdutos() {
  const select = document.getElementById('entrada-produto');
  select.innerHTML = '<option value="">Selecione...</option>';

  produtos.forEach(prod => {
    const option = document.createElement('option');
    option.value = prod.id;
    option.textContent = prod.nome;
    select.appendChild(option);
  });
}

// --------- CADASTRAR PRODUTO ----------
document.getElementById('form-produto').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-cat').value.trim();
  const fabricante = (document.getElementById('prod-fab')?.value || "").trim();

  try {
    const response = await fetch(`${API_URL}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, fabricante })
    });

    if (response.ok) {
      alert('Produto salvo!');
      e.target.reset();
      await init(); // recarrega para atualizar lista e fabricantes
    } else {
      const txt = await response.text();
      alert('Erro ao salvar produto: ' + txt);
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao salvar no banco de dados');
  }
});

// --------- REGISTRAR COMPRA (COM COR) ----------
document.getElementById('form-entrada').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idProduto = parseInt(document.getElementById('entrada-produto').value);
  const cor = (document.getElementById('entrada-cor')?.value || "").trim(); // NOVO
  const fornecedor = document.getElementById('entrada-fornecedor').value.trim();
  const fabricante = document.getElementById('entrada-fabricante')?.value || "";
  const data = document.getElementById('entrada-data').value;
  const custo = parseFloat(document.getElementById('entrada-custo').value);
  const qtd = parseInt(document.getElementById('entrada-qtd').value);
  const numeroPedido = (document.getElementById('entrada-pedido')?.value || "").trim();

  const dados = {
    produto_id: idProduto,
    fornecedor,
    fabricante,
    cor, // NOVO
    data,
    custo,
    qtd,
    numero_pedido: numeroPedido
  };

  try {
    const response = await fetch(`${API_URL}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      alert('Entrada registrada!');
      e.target.reset();
      await init();
    } else {
      const txt = await response.text();
      alert('Erro ao registrar compra: ' + txt);
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao registrar compra.');
  }
});

// --------- TABELA ESTOQUE ----------
function renderizarTabela() {
  const tbody = document.querySelector('#tabela-estoque tbody');
  tbody.innerHTML = '';

  produtos.forEach(prod => {
    let qtdTotal = 0;
    let custoTotalAcumulado = 0;

    (prod.historicoCompras || []).forEach(compra => {
      qtdTotal += Number(compra.qtd || 0);
      custoTotalAcumulado += (parseFloat(compra.custo || 0) * Number(compra.qtd || 0));
    });

    const custoMedio = qtdTotal > 0 ? (custoTotalAcumulado / qtdTotal).toFixed(2) : "0.00";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prod.nome}</td>
      <td>${prod.categoria || '-'}</td>
      <td>${prod.fabricante || '-'}</td>
      <td><strong>${qtdTotal}</strong> un</td>
      <td>R$ ${custoMedio}</td>
      <td class="acoes-btn">
        <button class="btn-acao btn-ver" onclick="verDetalhes(${prod.id})" title="Ver Histórico">📄</button>
        <button class="btn-acao btn-editar" onclick="abrirModalEditar(${prod.id})" title="Editar">✏️</button>
        <button class="btn-acao btn-deletar" onclick="deletarProduto(${prod.id})" title="Excluir">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --------- HISTÓRICO (COM COR) ----------
function garantirColunaCorNoHistorico() {
  const theadRow = document.querySelector('#tabela-historico thead tr');
  if (!theadRow) return;

  // Se já tem "Cor", não adiciona
  const headers = Array.from(theadRow.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
  if (headers.includes('cor')) return;

  // Layout atual: Data | Fornecedor | Fabricante | Custo | Qtd | Nº Pedido | Ações
  // Vamos inserir "Cor" logo após "Fabricante"
  const thCor = document.createElement('th');
  thCor.textContent = 'Cor';

  // Insere após o 3º th (Fabricante)
  const ths = theadRow.querySelectorAll('th');
  if (ths.length >= 3) {
    theadRow.insertBefore(thCor, ths[3]); // antes de "Custo Unit."
  } else {
    theadRow.appendChild(thCor);
  }
}

function verDetalhes(idProduto) {
  const produto = produtos.find(p => p.id === idProduto);
  const modal = document.getElementById('modal-detalhes');
  const tbodyHistorico = document.querySelector('#tabela-historico tbody');

  garantirColunaCorNoHistorico();

  document.getElementById('modal-titulo').innerText = `Histórico: ${produto.nome}`;
  tbodyHistorico.innerHTML = '';

  const historico = produto.historicoCompras || [];

  if (historico.length === 0) {
    // agora tem 8 colunas (com Cor)
    tbodyHistorico.innerHTML = '<tr><td colspan="8" style="text-align:center;">Sem histórico.</td></tr>';
  } else {
    historico.forEach(compra => {
      const tr = document.createElement('tr');

      const dataObj = new Date(compra.data);
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const dataISO = String(compra.data).split('T')[0];

      const custoNum = parseFloat(compra.custo);
      const pedidoTexto = compra.numero_pedido ? compra.numero_pedido : '-';
      const fabricanteTexto = compra.fabricante ? compra.fabricante : '-';
      const corTexto = compra.cor ? compra.cor : '-';

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${compra.fornecedor}</td>
        <td>${fabricanteTexto}</td>
        <td>${corTexto}</td>
        <td>R$ ${custoNum.toFixed(2)}</td>
        <td>${compra.qtd}</td>
        <td>${pedidoTexto}</td>
        <td style="display:flex; gap:5px;">
          <button class="btn-acao btn-editar"
            onclick="abrirModalEditarCompra(${compra.id}, ${produto.id}, '${compra.fornecedor}', '${fabricanteTexto}', '${corTexto}', '${dataISO}', ${custoNum}, ${compra.qtd}, '${pedidoTexto}')"
            title="Editar Lançamento">✏️</button>

          <button class="btn-acao btn-deletar"
            onclick="deletarCompra(${compra.id}, ${produto.id})"
            title="Excluir Lançamento">🗑️</button>
        </td>
      `;
      tbodyHistorico.appendChild(tr);
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

function fecharModalEditar() {
  document.getElementById('modal-editar').classList.add('hidden');
}

document.getElementById('form-editar').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('edit-id').value);
  const nome = document.getElementById('edit-nome').value.trim();
  const categoria = document.getElementById('edit-categoria').value.trim();
  const fabricante = document.getElementById('edit-fabricante').value.trim();

  try {
    const response = await fetch(`${API_URL}/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, fabricante })
    });

    if (response.ok) {
      alert("Produto atualizado!");
      fecharModalEditar();
      await init();
    } else {
      const txt = await response.text();
      alert("Erro ao editar produto: " + txt);
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao editar produto.");
  }
});

// --------- EDITAR COMPRA (COM COR) ----------
function abrirModalEditarCompra(idCompra, idProduto, fornecedor, fabricante, cor, data, custo, qtd, pedido) {
  document.getElementById('edit-compra-id').value = idCompra;
  document.getElementById('edit-compra-prod-id').value = idProduto;
  document.getElementById('edit-compra-fornecedor').value = fornecedor;
  document.getElementById('edit-compra-data').value = data;
  document.getElementById('edit-compra-custo').value = custo;
  document.getElementById('edit-compra-qtd').value = qtd;
  document.getElementById('edit-compra-pedido').value = (pedido === '-' ? '' : pedido);

  // fabricante select
  const editFabEl = document.getElementById('edit-compra-fabricante');
  if (editFabEl) {
    // garante opção presente
    let found = false;
    [...editFabEl.options].forEach(o => { if (o.value === fabricante) found = true; });
    if (!found && fabricante && fabricante !== '-') {
      const opt = document.createElement('option');
      opt.value = fabricante;
      opt.textContent = fabricante;
      editFabEl.appendChild(opt);
    }
    editFabEl.value = (fabricante === '-' ? '' : fabricante);
  }

  // cor (se você adicionar no HTML)
  const editCorEl = document.getElementById('edit-compra-cor');
  if (editCorEl) editCorEl.value = (cor === '-' ? '' : cor);

  document.getElementById('modal-detalhes').classList.add('hidden');
  document.getElementById('modal-editar-compra').classList.remove('hidden');
}

function fecharModalEditarCompra() {
  document.getElementById('modal-editar-compra').classList.add('hidden');
  const idProd = document.getElementById('edit-compra-prod-id').value;
  if (idProd) verDetalhes(parseInt(idProd));
}

document.getElementById('form-editar-compra').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idCompra = document.getElementById('edit-compra-id').value;
  const idProduto = document.getElementById('edit-compra-prod-id').value;

  if (!idCompra || idCompra === "undefined") {
    alert("Erro: O ID da compra não foi encontrado. Atualize a página e tente novamente.");
    return;
  }

  const fabEditEl = document.getElementById('edit-compra-fabricante');
  const fabricante = fabEditEl ? fabEditEl.value : "";

  const corEditEl = document.getElementById('edit-compra-cor');
  const cor = corEditEl ? corEditEl.value.trim() : "";

  const dados = {
    fornecedor: document.getElementById('edit-compra-fornecedor').value.trim(),
    fabricante,
    cor, // NOVO
    data: document.getElementById('edit-compra-data').value,
    custo: parseFloat(document.getElementById('edit-compra-custo').value),
    qtd: parseInt(document.getElementById('edit-compra-qtd').value),
    numero_pedido: (document.getElementById('edit-compra-pedido')?.value || "").trim()
  };

  try {
    const response = await fetch(`${API_URL}/compras/${idCompra}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      alert('Histórico corrigido com sucesso!');
      document.getElementById('modal-editar-compra').classList.add('hidden');
      await init();
      if (idProduto) verDetalhes(parseInt(idProduto));
    } else {
      const txt = await response.text();
      alert('Erro ao salvar: ' + txt);
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão ao tentar editar.');
  }
});

// --------- DELETAR COMPRA ----------
async function deletarCompra(idCompra, idProduto) {
  if (confirm("Deseja excluir este lançamento? O estoque total será recalculado.")) {
    try {
      const response = await fetch(`${API_URL}/compras/${idCompra}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Lançamento excluído.');
        await init();
        verDetalhes(idProduto);
      } else {
        const txt = await response.text();
        alert("Erro ao excluir: " + txt);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir lançamento.');
    }
  }
}

// --------- DELETAR PRODUTO ----------
async function deletarProduto(id) {
  if (confirm("ATENÇÃO: Isso apagará o produto E TODO O HISTÓRICO dele para sempre. Continuar?")) {
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert("Produto excluído com sucesso!");
        await init();
      } else {
        const txt = await response.text();
        alert("Erro ao excluir: " + txt);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao tentar excluir.");
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
