let produtos = [];
let fabricantes = [];

const API_URL = "";

// ====== Utils ======
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

// ====== Carregamentos ======
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


async function init() {
  try {
    const [respProdutos] = await Promise.all([
      fetch(`${API_URL}/produtos`)
    ]);

    produtos = await respProdutos.json();

    atualizarSelectProdutos();
    renderizarTabela();

    // fabricantes depende do endpoint novo
    await carregarFabricantes();
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados:", error);
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

// ====== CADASTRO PRODUTO ======
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
      const novoProd = await response.json();
      novoProd.historicoCompras = novoProd.historicoCompras || [];
      produtos.unshift(novoProd);

      alert('Produto salvo!');
      e.target.reset();
      atualizarSelectProdutos();
      renderizarTabela();
    } else {
      alert('Erro ao salvar produto.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao salvar no banco de dados');
  }
});

// ====== REGISTRAR COMPRA (AGORA COM fabricante) ======
document.getElementById('form-entrada').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idProduto = parseInt(document.getElementById('entrada-produto').value);
  const fornecedor = document.getElementById('entrada-fornecedor').value.trim();

  // NOVO: fabricante via select
  const fabricanteEl = document.getElementById('entrada-fabricante');
 const fabricante = document.getElementById('entrada-fabricante')?.value || "";

  const data = document.getElementById('entrada-data').value;
  const custo = parseFloat(document.getElementById('entrada-custo').value);
  const qtd = parseInt(document.getElementById('entrada-qtd').value);
  const numeroPedido = document.getElementById('entrada-pedido').value.trim();

 const dados = { produto_id: idProduto, 
    fornecedor, 
    fabricante, 
    data, custo, 
    qtd, numero_pedido: numeroPedido };


  try {
    const response = await fetch(`${API_URL}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      alert('Entrada registrada!');
      e.target.reset();

      // recarrega tudo para refletir histórico + atualizar lista de fabricantes
      await init();
    } else {
      alert('Erro ao registrar compra (servidor recusou).');
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao registrar compra.');
  }
});

// ====== TABELA ======
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

// ====== HISTÓRICO (agora usa compra.fabricante) ======
function verDetalhes(idProduto) {
  const produto = produtos.find(p => p.id === idProduto);
  const modal = document.getElementById('modal-detalhes');
  const tbodyHistorico = document.querySelector('#tabela-historico tbody');

  document.getElementById('modal-titulo').innerText = `Histórico: ${produto.nome}`;
  tbodyHistorico.innerHTML = '';

  const historico = produto.historicoCompras || [];

  if (historico.length === 0) {
    tbodyHistorico.innerHTML = '<tr><td colspan="7" style="text-align:center;">Sem histórico.</td></tr>';
  } else {
    historico.forEach(compra => {
      const tr = document.createElement('tr');

      const dataObj = new Date(compra.data);
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const dataISO = String(compra.data).split('T')[0];

      const custoNum = parseFloat(compra.custo);
      const pedidoTexto = compra.numero_pedido ? compra.numero_pedido : '-';
      const fabricanteTexto = compra.fabricante ? compra.fabricante : '-';

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${compra.fornecedor}</td>
        <td>${fabricanteTexto}</td>
        <td>R$ ${custoNum.toFixed(2)}</td>
        <td>${compra.qtd}</td>
        <td>${pedidoTexto}</td>
        <td style="display:flex; gap:5px;">
          <button class="btn-acao btn-editar"
            onclick="abrirModalEditarCompra(${compra.id}, ${produto.id}, '${compra.fornecedor}', '${fabricanteTexto}', '${dataISO}', ${custoNum}, ${compra.qtd}, '${pedidoTexto}')"
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

// ====== EXCEL (inclui fabricante da compra) ======
function exportarParaExcel() {
  if (produtos.length === 0) { alert("Não há dados!"); return; }

  const dadosEstoque = produtos.map(prod => {
    let qtdTotal = 0;
    let custoTotalAcumulado = 0;

    (prod.historicoCompras || []).forEach(compra => {
      qtdTotal += Number(compra.qtd || 0);
      custoTotalAcumulado += (parseFloat(compra.custo || 0) * Number(compra.qtd || 0));
    });

    const custoMedio = qtdTotal > 0 ? (custoTotalAcumulado / qtdTotal).toFixed(2) : "0.00";

    return {
      "ID": prod.id,
      "Produto": prod.nome,
      "Categoria": prod.categoria || "",
      "Fabricante (Produto)": prod.fabricante || "",
      "Estoque Atual": qtdTotal,
      "Custo Médio": `R$ ${custoMedio}`,
      "Valor Total Investido": `R$ ${custoTotalAcumulado.toFixed(2)}`
    };
  });

  const dadosHistorico = [];
  produtos.forEach(prod => {
    (prod.historicoCompras || []).forEach(compra => {
      const dataFormatada = new Date(compra.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      dadosHistorico.push({
        "Produto": prod.nome,
        "Categoria": prod.categoria || "",
        "Fabricante (Compra)": compra.fabricante || "",
        "Data": dataFormatada,
        "Fornecedor": compra.fornecedor,
        "Qtd": compra.qtd,
        "Nº Pedido": compra.numero_pedido || "",
        "Custo Unit": `R$ ${parseFloat(compra.custo).toFixed(2)}`
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const wsEstoque = XLSX.utils.json_to_sheet(dadosEstoque);
  XLSX.utils.book_append_sheet(wb, wsEstoque, "Resumo");

  if (dadosHistorico.length > 0) {
    const wsHist = XLSX.utils.json_to_sheet(dadosHistorico);
    XLSX.utils.book_append_sheet(wb, wsHist, "Histórico");
  }

  XLSX.writeFile(wb, "Controle_Estoque_DB.xlsx");
}

// ====== DELETAR PRODUTO ======
async function deletarProduto(id) {
  if (confirm("ATENÇÃO: Isso apagará o produto E TODO O HISTÓRICO dele para sempre. Continuar?")) {
    try {
      const response = await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        produtos = produtos.filter(p => p.id !== id);
        renderizarTabela();
        atualizarSelectProdutos();
        alert("Produto excluído com sucesso!");
      } else {
        alert("Erro ao excluir. O servidor não autorizou.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao tentar excluir.");
    }
  }
}

// ====== EDITAR PRODUTO ======
function abrirModalEditar(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  document.getElementById('edit-id').value = produto.id;
  document.getElementById('edit-nome').value = produto.nome;
  document.getElementById('edit-categoria').value = produto.categoria || '';
  if (document.getElementById('edit-fabricante')) {
    document.getElementById('edit-fabricante').value = produto.fabricante || '';
  }

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
  const fabricante = document.getElementById('edit-fabricante') ? document.getElementById('edit-fabricante').value.trim() : "";

  try {
    const response = await fetch(`${API_URL}/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, fabricante })
    });

    if (response.ok) {
      await init();
      alert("Produto atualizado!");
      fecharModalEditar();
    } else {
      alert("Erro ao editar produto (servidor recusou).");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao editar produto.");
  }
});

// ====== EDITAR COMPRA (agora com fabricante) ======
function abrirModalEditarCompra(idCompra, idProduto, fornecedor, fabricante, data, custo, qtd, pedido) {
  document.getElementById('edit-compra-id').value = idCompra;
  document.getElementById('edit-compra-prod-id').value = idProduto;
  document.getElementById('edit-compra-fornecedor').value = fornecedor;
  document.getElementById('edit-compra-data').value = data;
  document.getElementById('edit-compra-custo').value = custo;
  document.getElementById('edit-compra-qtd').value = qtd;
  document.getElementById('edit-compra-pedido').value = (pedido === '-' ? '' : pedido);

  const editFabEl = document.getElementById('edit-compra-fabricante');
  if (editFabEl) {
    // se for select, tenta selecionar; se não existir na lista, coloca option temporária
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

  const dados = {
    fornecedor: document.getElementById('edit-compra-fornecedor').value.trim(),
    fabricante, // <- novo
    data: document.getElementById('edit-compra-data').value,
    custo: parseFloat(document.getElementById('edit-compra-custo').value),
    qtd: parseInt(document.getElementById('edit-compra-qtd').value),
    numero_pedido: document.getElementById('edit-compra-pedido').value.trim()
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
      alert('Erro ao salvar. O servidor recusou os dados.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão ao tentar editar.');
  }
});

// ====== DELETAR COMPRA ======
async function deletarCompra(idCompra, idProduto) {
  if (confirm("Deseja excluir este lançamento? O estoque total será recalculado.")) {
    try {
      const response = await fetch(`${API_URL}/compras/${idCompra}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Lançamento excluído.');
        await init();
        verDetalhes(idProduto);
      } else {
        alert("Erro ao excluir (servidor recusou).");
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir lançamento.');
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
