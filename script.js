let produtos = [];
const API_URL = ""; // mesmo host

function fecharModal() {
  const modal = document.getElementById('modal-detalhes');
  if (modal) modal.classList.add('hidden');
}

async function init() {
  try {
    const response = await fetch(`${API_URL}/produtos`);
    produtos = await response.json();

    atualizarSelectProdutos();
    renderizarTabela();
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados:", error);
    alert("Erro: Não foi possível carregar os produtos. Verifique se o servidor (Node.js) está rodando.");
  }

  const modal = document.getElementById('modal-detalhes');
  window.onclick = function (event) {
    if (event.target == modal) fecharModal();
  };
}

function mostrarAba(aba) {
  document.getElementById('aba-cadastro').classList.add('hidden');
  document.getElementById('aba-entrada').classList.add('hidden');
  document.getElementById('btn-cadastro').classList.remove('active');
  document.getElementById('btn-entrada').classList.remove('active');

  document.getElementById(`aba-${aba}`).classList.remove('hidden');
  document.getElementById(`btn-${aba}`).classList.add('active');
}

// 1) CADASTRAR NOVO PRODUTO (COM fabricante)
document.getElementById('form-produto').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nome = document.getElementById('prod-nome').value.trim();
  const categoria = document.getElementById('prod-cat').value.trim();
  const fabricante = (document.getElementById('prod-fab')?.value || "").trim(); // <- novo

  const dados = { nome, categoria, fabricante };

  try {
    const response = await fetch(`${API_URL}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      const novoProd = await response.json();
      // garante estrutura
      novoProd.historicoCompras = novoProd.historicoCompras || [];
      produtos.unshift(novoProd);

      alert('Produto salvo no banco!');
      e.target.reset();
      atualizarSelectProdutos();
      renderizarTabela();
    } else {
      alert('Erro ao salvar produto (servidor recusou).');
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao salvar no banco de dados');
  }
});

// 2) REGISTRAR COMPRA (igual)
document.getElementById('form-entrada').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idProduto = parseInt(document.getElementById('entrada-produto').value);
  const fornecedor = document.getElementById('entrada-fornecedor').value.trim();
  const data = document.getElementById('entrada-data').value;
  const custo = parseFloat(document.getElementById('entrada-custo').value);
  const qtd = parseInt(document.getElementById('entrada-qtd').value);
  const numeroPedido = document.getElementById('entrada-pedido').value.trim();

  const dados = { produto_id: idProduto, fornecedor, data, custo, qtd, numero_pedido: numeroPedido };

  try {
    const response = await fetch(`${API_URL}/compras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      // Melhor: recarrega do servidor para pegar ID da compra e evitar inconsistência
      await init();

      alert('Entrada registrada!');
      e.target.reset();
      renderizarTabela();
    } else {
      alert('Erro ao registrar compra (servidor recusou).');
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao registrar compra.');
  }
});

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

    // CORRIGIDO: agora bate com o cabeçalho: Produto | Categoria | Fabricante | Qtd Total | Custo Médio | Ações
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

function verDetalhes(idProduto) {
  const produto = produtos.find(p => p.id === idProduto);
  const modal = document.getElementById('modal-detalhes');
  const tbodyHistorico = document.querySelector('#tabela-historico tbody');

  document.getElementById('modal-titulo').innerText = `Histórico: ${produto.nome}`;
  tbodyHistorico.innerHTML = '';

  const historico = produto.historicoCompras || [];

  if (historico.length === 0) {
    // cabeçalho do seu modal tem 7 colunas (inclui Ações)
    tbodyHistorico.innerHTML = '<tr><td colspan="7" style="text-align:center;">Sem histórico.</td></tr>';
  } else {
    historico.forEach(compra => {
      const tr = document.createElement('tr');

      const dataObj = new Date(compra.data);
      const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const dataISO = String(compra.data).split('T')[0];

      const custoNum = parseFloat(compra.custo);
      const pedidoTexto = compra.numero_pedido ? compra.numero_pedido : '-';

      // Fabricante vem do PRODUTO (não da compra)
      const fabricanteTexto = produto.fabricante || '-';

      tr.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${compra.fornecedor}</td>
        <td>${fabricanteTexto}</td>
        <td>R$ ${custoNum.toFixed(2)}</td>
        <td>${compra.qtd}</td>
        <td>${pedidoTexto}</td>
        <td style="display:flex; gap:5px;">
          <button class="btn-acao btn-editar"
            onclick="abrirModalEditarCompra(${compra.id}, ${produto.id}, '${compra.fornecedor}', '${dataISO}', ${custoNum}, ${compra.qtd}, '${pedidoTexto}')"
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
      "Fabricante": prod.fabricante || "", // <- novo
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
        "Fabricante": prod.fabricante || "", // <- novo (repete por linha, mas é útil)
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

// --- DELETAR PRODUTO (mantive só 1 função, sem duplicar) ---
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

// --- EDITAR PRODUTO (COM fabricante) ---
function abrirModalEditar(id) {
  const produto = produtos.find(p => p.id === id);
  if (produto) {
    document.getElementById('edit-id').value = produto.id;
    document.getElementById('edit-nome').value = produto.nome;
    document.getElementById('edit-categoria').value = produto.categoria || '';
    document.getElementById('edit-fabricante').value = produto.fabricante || ''; // <- novo
    document.getElementById('modal-editar').classList.remove('hidden');
  }
}

function fecharModalEditar() {
  document.getElementById('modal-editar').classList.add('hidden');
}

document.getElementById('form-editar').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('edit-id').value);
  const nome = document.getElementById('edit-nome').value.trim();
  const categoria = document.getElementById('edit-categoria').value.trim();
  const fabricante = document.getElementById('edit-fabricante').value.trim(); // <- novo

  try {
    const response = await fetch(`${API_URL}/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, categoria, fabricante })
    });

    if (response.ok) {
      const index = produtos.findIndex(p => p.id === id);
      if (index !== -1) {
        produtos[index].nome = nome;
        produtos[index].categoria = categoria;
        produtos[index].fabricante = fabricante;
      }

      alert("Produto atualizado!");
      fecharModalEditar();
      renderizarTabela();
      atualizarSelectProdutos();
    } else {
      alert("Erro ao editar produto (servidor recusou).");
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao editar produto.");
  }
});

// --- EDITAR COMPRA (igual ao seu, mantido) ---
function abrirModalEditarCompra(idCompra, idProduto, fornecedor, data, custo, qtd, pedido) {
  document.getElementById('edit-compra-id').value = idCompra;
  document.getElementById('edit-compra-prod-id').value = idProduto;
  document.getElementById('edit-compra-fornecedor').value = fornecedor;
  document.getElementById('edit-compra-data').value = data;
  document.getElementById('edit-compra-custo').value = custo;
  document.getElementById('edit-compra-qtd').value = qtd;
  document.getElementById('edit-compra-pedido').value = (pedido === '-' ? '' : pedido);

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
    alert("Erro Crítico: O ID da compra não foi encontrado. Atualize a página e tente novamente.");
    return;
  }

  const dados = {
    fornecedor: document.getElementById('edit-compra-fornecedor').value,
    data: document.getElementById('edit-compra-data').value,
    custo: parseFloat(document.getElementById('edit-compra-custo').value),
    qtd: parseInt(document.getElementById('edit-compra-qtd').value),
    numero_pedido: document.getElementById('edit-compra-pedido').value
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
