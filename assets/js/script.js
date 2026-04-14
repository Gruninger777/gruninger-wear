document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("#grid-produtos");
  const filtros = document.querySelector("#filtros-catalogo");
  const vazio = document.querySelector("#produtos-vazio");

  if (!grid || !window.CatalogoUtils) {
    return;
  }

  let filtroAtivo = "todos";

  configurarFiltros(filtros, (novoFiltro) => {
    filtroAtivo = novoFiltro;
    aplicarFiltro(grid, filtroAtivo, vazio);
  });

  ativarInteracoesProdutos(grid);
  aplicarFiltro(grid, filtroAtivo, vazio);

  const source = grid.dataset.produtosSrc;

  if (!source) {
    return;
  }

  try {
    const produtos = await window.CatalogoUtils.carregarProdutos(source);

    if (!produtos.length) {
      aplicarFiltro(grid, filtroAtivo, vazio);
      return;
    }

    grid.innerHTML = produtos.map(criarCardProduto).join("");
    ativarInteracoesProdutos(grid);
    aplicarFiltro(grid, filtroAtivo, vazio);
  } catch (error) {
    console.info("Catálogo usando fallback estático.", error);
    aplicarFiltro(grid, filtroAtivo, vazio);
  }
});

function criarCardProduto(produto) {
  const utils = window.CatalogoUtils;
  const variacaoPadrao = produto.variacoes[0];
  const imagemVerso = utils.escapeAttribute(variacaoPadrao.imagemVerso);
  const imagemFrente = utils.escapeAttribute(variacaoPadrao.imagemFrente);
  const nome = utils.escapeHtml(produto.nome);
  const preco = utils.escapeHtml(produto.precoTexto);
  const destaque = utils.escapeHtml(produto.destaque);
  const detalhes = utils.escapeHtml(produto.detalhes);
  const alt = utils.escapeHtml(`${produto.nome} ${variacaoPadrao.corLabel}`.trim());
  const produtoUrl = utils.escapeAttribute(utils.criarUrlProduto(produto.id));
  const filtroKey = utils.escapeAttribute(mapearFiltroProduto(produto));
  const mensagem = encodeURIComponent(utils.criarMensagemWhatsapp(produto, variacaoPadrao));

  return `
    <article
      class="produto produto-linkavel"
      data-produto-url="${produtoUrl}"
      data-filter-key="${filtroKey}"
      tabindex="0"
      role="link"
      aria-label="Ver detalhes de ${nome}"
    >
      <div class="produto-media">
        <img class="produto-imagem produto-imagem--verso" src="${imagemVerso}" alt="${alt}" loading="lazy">
        <img class="produto-imagem produto-imagem--frente" src="${imagemFrente}" alt="" loading="lazy" aria-hidden="true">
      </div>
      <div class="info">
        <h2>${nome}</h2>
        <p class="preco">${preco}</p>
        <p class="destaque-produto">${destaque}</p>
        <div class="detalhes">${detalhes}</div>
        <a class="botao" href="https://wa.me/${utils.WHATSAPP_NUMBER}?text=${mensagem}" target="_blank" rel="noreferrer">
          Comprar no WhatsApp
        </a>
      </div>
    </article>
  `;
}

function configurarFiltros(container, onChange) {
  if (!container) {
    return;
  }

  const botoes = [...container.querySelectorAll(".filtro-botao")];

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const filtro = botao.dataset.filter || "todos";

      botoes.forEach((item) => {
        const ativo = item === botao;
        item.classList.toggle("is-active", ativo);
        item.setAttribute("aria-pressed", String(ativo));
      });

      onChange(filtro);
    });
  });
}

function aplicarFiltro(grid, filtroAtivo, vazio) {
  const cards = [...grid.querySelectorAll(".produto")];

  if (!cards.length) {
    if (vazio) {
      vazio.hidden = true;
    }

    return;
  }

  let visiveis = 0;

  cards.forEach((card) => {
    const filterKey = card.dataset.filterKey || "";
    const mostrar = filtroAtivo === "todos" || filterKey === filtroAtivo;

    card.hidden = !mostrar;

    if (mostrar) {
      visiveis += 1;
    }
  });

  if (vazio) {
    vazio.hidden = visiveis !== 0;
  }
}

function mapearFiltroProduto(produto) {
  const categoria = String(produto.categoria || "").toLowerCase();
  const subcategoria = String(produto.subcategoria || "").toLowerCase();

  if (categoria === "camisas" && subcategoria === "street") {
    return "street";
  }

  if (categoria === "camisas" && subcategoria === "oversized") {
    return "oversized";
  }

  if (categoria === "camisetas-cristas") {
    return "cristas";
  }

  if (categoria === "polos") {
    return "polos";
  }

  if (categoria === "texturizadas") {
    return "texturizadas";
  }

  if (categoria === "infantis") {
    return "infantis";
  }

  return categoria;
}

function ativarInteracoesProdutos(container) {
  const cards = container.querySelectorAll(".produto-linkavel");
  const botoes = container.querySelectorAll(".botao");

  cards.forEach((card) => {
    if (card.dataset.boundCard === "true") {
      return;
    }

    card.dataset.boundCard = "true";
    card.addEventListener("click", aoClicarNoCard);
    card.addEventListener("keydown", aoUsarTecladoNoCard);
  });

  botoes.forEach((botao) => {
    if (botao.dataset.boundButton === "true") {
      return;
    }

    botao.dataset.boundButton = "true";
    botao.addEventListener("click", (event) => event.stopPropagation());
  });
}

function aoClicarNoCard(event) {
  if (event.target.closest(".botao")) {
    return;
  }

  const url = event.currentTarget.dataset.produtoUrl;

  if (url) {
    window.location.href = url;
  }
}

function aoUsarTecladoNoCard(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();

  const url = event.currentTarget.dataset.produtoUrl;

  if (url) {
    window.location.href = url;
  }
}
