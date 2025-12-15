// Variável global que mantém os dados na tela
let produtos = [];
//const API_URL = "http://localhost:3000"; // Endereço do nosso servidor Node
//const API_URL = "https://nome-do-seu-app.herokuapp.com";
const API_URL = "";

// Função de fechar modal (Global)
function fecharModal() {
    const modal = document.getElementById('modal-detalhes');
    if (modal) modal.classList.add('hidden');
}

// INICIALIZAÇÃO: Agora busca do Banco de Dados!
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

    // Configura cliques do modal
    const closeBtn = document.querySelector('.close');
    const modal = document.getElementById('modal-detalhes');
    
    // Configura o fechamento ao clicar fora do modal
    window.onclick = function(event) {
        if (event.target == modal) fecharModal();
    }
}

// --- CONTROLE DE ABAS ---
function mostrarAba(aba) {
    document.getElementById('aba-cadastro').classList.add('hidden');
    document.getElementById('aba-entrada').classList.add('hidden');
    document.getElementById('btn-cadastro').classList.remove('active');
    document.getElementById('btn-entrada').classList.remove('active');

    document.getElementById(`aba-${aba}`).classList.remove('hidden');
    document.getElementById(`btn-${aba}`).classList.add('active');
}

// 1. CADASTRAR NOVO PRODUTO (POST no Banco)
document.getElementById('form-produto').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('prod-nome').value;
    const categoria = document.getElementById('prod-cat').value;

    const dados = { nome, categoria };

    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            const novoProd = await response.json();
            produtos.unshift(novoProd); // Adiciona no início da lista local
            alert('Produto salvo no PostgreSQL!');
            e.target.reset();
            atualizarSelectProdutos();
            renderizarTabela();
        }
    } catch (error) {
        alert('Erro ao salvar no banco de dados');
    }
});

// 2. REGISTRAR COMPRA (POST no Banco)
document.getElementById('form-entrada').addEventListener('submit', async function(e) {
    e.preventDefault();

    const idProduto = parseInt(document.getElementById('entrada-produto').value);
    const fornecedor = document.getElementById('entrada-fornecedor').value;
    const data = document.getElementById('entrada-data').value;
    const custo = parseFloat(document.getElementById('entrada-custo').value);
    const qtd = parseInt(document.getElementById('entrada-qtd').value);
    const numeroPedido = document.getElementById('entrada-pedido').value; // NOVO CAMPO

    // Adicionado numero_pedido ao objeto enviado
    const dados = { produto_id: idProduto, fornecedor, data, custo, qtd, numero_pedido: numeroPedido };

    try {
        const response = await fetch(`${API_URL}/compras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            const index = produtos.findIndex(p => p.id === idProduto);
            if (index !== -1) {
                // Atualiza localmente também
                produtos[index].historicoCompras.push({ 
                    fornecedor, data, custo, qtd, numero_pedido: numeroPedido 
                });
            }

            alert('Entrada registrada com Nº do Pedido!');
            e.target.reset();
            renderizarTabela();
        }
    } catch (error) {
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

        prod.historicoCompras.forEach(compra => {
            qtdTotal += compra.qtd;
            custoTotalAcumulado += (parseFloat(compra.custo) * compra.qtd);
        });

        const custoMedio = qtdTotal > 0 ? (custoTotalAcumulado / qtdTotal).toFixed(2) : "0.00";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${prod.nome}</td>
            <td>${prod.categoria}</td>
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
    
    // Adicionei uma coluna extra no cabeçalho se ainda não tiver
    const thead = document.querySelector('#tabela-historico thead tr');
    if (!thead.innerHTML.includes('Ações')) {
        const th = document.createElement('th');
        th.innerText = 'Ações';
        thead.appendChild(th);
    }

    document.getElementById('modal-titulo').innerText = `Histórico: ${produto.nome}`;
    tbodyHistorico.innerHTML = '';

    if (!produto.historicoCompras || produto.historicoCompras.length === 0) {
        tbodyHistorico.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sem histórico.</td></tr>';
    } else {
        // Agora cada compra tem um ID único vindo do banco (compra.id)
        produto.historicoCompras.forEach(compra => {
            const tr = document.createElement('tr');
            
            // Tratamento de data para input date (YYYY-MM-DD) e visualização
            const dataObj = new Date(compra.data);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            // Formato ISO para passar para o botão de editar (yyyy-mm-dd)
            const dataISO = compra.data.split('T')[0]; 

            const custoNum = parseFloat(compra.custo);
            const pedidoTexto = compra.numero_pedido ? compra.numero_pedido : '-';

            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${compra.fornecedor}</td>
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
// ==========================================
// FUNÇÃO EXCEL (MANTIDA IGUAL, POIS USA A LISTA 'produtos')
// ==========================================
function exportarParaExcel() {
    if (produtos.length === 0) { alert("Não há dados!"); return; }

    const dadosEstoque = produtos.map(prod => {
        let qtdTotal = 0;
        let custoTotalAcumulado = 0;
        prod.historicoCompras.forEach(compra => {
            qtdTotal += compra.qtd;
            custoTotalAcumulado += (parseFloat(compra.custo) * compra.qtd);
        });
        const custoMedio = qtdTotal > 0 ? (custoTotalAcumulado / qtdTotal).toFixed(2) : "0.00";
        return {
            "ID": prod.id, "Produto": prod.nome, "Categoria": prod.categoria,
            "Estoque Atual": qtdTotal, "Custo Médio": `R$ ${custoMedio}`,
            "Valor Total Investido": `R$ ${custoTotalAcumulado.toFixed(2)}`
        };
    });

    const dadosHistorico = [];
    produtos.forEach(prod => {
        prod.historicoCompras.forEach(compra => {
            const dataFormatada = new Date(compra.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            dadosHistorico.push({
        "Produto": prod.nome, 
        "Categoria": prod.categoria,
        "Data": dataFormatada, 
        "Fornecedor": compra.fornecedor,
        "Qtd": compra.qtd, 
        "Nº Pedido": compra.numero_pedido || "", // NOVO CAMPO NO EXCEL
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

// Iniciar sistema
document.addEventListener('DOMContentLoaded', init);


// --- LÓGICA DE DELETAR ---
async function deletarProduto(id) {
    if (confirm("Tem certeza? Isso apagará o produto e TODO o histórico de compras dele.")) {
        try {
            const response = await fetch(`${API_URL}/produtos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove da lista local e atualiza a tela
                produtos = produtos.filter(p => p.id !== id);
                renderizarTabela();
                atualizarSelectProdutos();
                alert("Produto excluído com sucesso!");
            }
        } catch (error) {
            alert("Erro ao excluir produto.");
            console.error(error);
        }
    }
}

// --- LÓGICA DE EDITAR ---
function abrirModalEditar(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) {
        document.getElementById('edit-id').value = produto.id;
        document.getElementById('edit-nome').value = produto.nome;
        document.getElementById('edit-categoria').value = produto.categoria;
        
        document.getElementById('modal-editar').classList.remove('hidden');
    }
}

function fecharModalEditar() {
    document.getElementById('modal-editar').classList.add('hidden');
}

// Envio do formulário de edição
document.getElementById('form-editar').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('edit-id').value);
    const nome = document.getElementById('edit-nome').value;
    const categoria = document.getElementById('edit-categoria').value;

    try {
        const response = await fetch(`${API_URL}/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, categoria })
        });

        if (response.ok) {
            // Atualiza lista local
            const index = produtos.findIndex(p => p.id === id);
            if (index !== -1) {
                produtos[index].nome = nome;
                produtos[index].categoria = categoria;
            }
            
            alert("Produto atualizado!");
            fecharModalEditar();
            renderizarTabela();
            atualizarSelectProdutos();
        }
    } catch (error) {
        alert("Erro ao editar produto.");
    }
});

// --- LÓGICA DE EDITAR UMA COMPRA (HISTÓRICO) ---

function abrirModalEditarCompra(idCompra, idProduto, fornecedor, data, custo, qtd, pedido) {
    // Preenche o formulário com os dados atuais
    document.getElementById('edit-compra-id').value = idCompra;
    document.getElementById('edit-compra-prod-id').value = idProduto;
    document.getElementById('edit-compra-fornecedor').value = fornecedor;
    document.getElementById('edit-compra-data').value = data;
    document.getElementById('edit-compra-custo').value = custo;
    document.getElementById('edit-compra-qtd').value = qtd;
    document.getElementById('edit-compra-pedido').value = (pedido === '-' ? '' : pedido);

    // Esconde o modal de listagem para focar na edição (opcional, mas fica mais limpo)
    document.getElementById('modal-detalhes').classList.add('hidden');
    document.getElementById('modal-editar-compra').classList.remove('hidden');
}

function fecharModalEditarCompra() {
    document.getElementById('modal-editar-compra').classList.add('hidden');
    // Reabre o modal de detalhes para ver o resultado
    const idProd = document.getElementById('edit-compra-prod-id').value;
    if(idProd) verDetalhes(parseInt(idProd));
}

// Salvar a edição da compra

// Salvar a edição da compra (Versão Corrigida e com Logs)
document.getElementById('form-editar-compra').addEventListener('submit', async function(e) {
    e.preventDefault();

    const idCompra = document.getElementById('edit-compra-id').value;
    const idProduto = document.getElementById('edit-compra-prod-id').value;
    
    // Verificação de erro: Se o ID estiver vazio, para tudo.
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
            
            // Recarrega tudo para garantir que os dados estão frescos
            await init(); 
            
            // Reabre o modal de detalhes do produto certo
            if (idProduto) {
                verDetalhes(parseInt(idProduto));
            }
        } else {
            alert('Erro ao salvar. O servidor recusou os dados.');
        }
    } catch (error) {
        console.error(error);
        alert('Erro de conexão ao tentar editar.');
    }
});
// --- LÓGICA DE DELETAR UMA COMPRA (HISTÓRICO) ---
async function deletarCompra(idCompra, idProduto) {
    if (confirm("Deseja excluir este lançamento? O estoque total será recalculado.")) {
        try {
            const response = await fetch(`${API_URL}/compras/${idCompra}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Lançamento excluído.');
                // Recarrega dados para atualizar totais
                await init();
                // Atualiza a visualização do modal
                verDetalhes(idProduto);
            }
        } catch (error) {
            alert('Erro ao excluir lançamento.');
        }
    }
}

// --- CORREÇÃO DA DELEÇÃO DO PRODUTO PRINCIPAL ---
async function deletarProduto(id) {
    if (confirm("ATENÇÃO: Isso apagará o produto E TODO O HISTÓRICO dele para sempre. Continuar?")) {
        try {
            const response = await fetch(`${API_URL}/produtos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Atualiza a tela removendo o produto
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