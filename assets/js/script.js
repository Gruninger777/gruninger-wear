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

  prepararImagensProduto(grid);
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
    prepararImagensProduto(grid);
    aplicarFiltro(grid, filtroAtivo, vazio);
  } catch (error) {
    console.info("Catálogo usando fallback estático.", error);
    prepararImagensProduto(grid);
    aplicarFiltro(grid, filtroAtivo, vazio);
  }
});

function criarCardProduto(produto) {
  const utils = window.CatalogoUtils;
  const variacaoPadrao = produto.variacoes[0];
  const imagemVerso = utils.escapeAttribute(utils.obterImagemPrincipal(variacaoPadrao));
  const imagemFrente = utils.escapeAttribute(utils.obterImagemHover(variacaoPadrao));
  const nome = utils.escapeHtml(produto.nome);
  const preco = utils.escapeHtml(produto.precoTexto);
  const destaque = utils.escapeHtml(produto.destaque);
  const detalhes = utils.escapeHtml(produto.detalhes);
  const alt = utils.escapeHtml(produto.alt || `${produto.nome} ${variacaoPadrao.corLabel}`.trim());
  const produtoUrl = utils.escapeAttribute(utils.criarUrlProduto(produto.id));
  const filtroKey = utils.escapeAttribute(mapearFiltroProduto(produto));
  const mensagem = encodeURIComponent(utils.criarMensagemWhatsapp(produto, variacaoPadrao));

  return `
    <article class="produto produto-linkavel" data-filter-key="${filtroKey}">
      <a class="produto-card-link" href="${produtoUrl}" aria-label="Ver detalhes de ${nome}"></a>
      <div class="produto-media">
        <img
          class="produto-imagem produto-imagem--verso"
          src="${imagemVerso}"
          data-image-primary="${imagemVerso}"
          data-image-secondary="${imagemFrente}"
          alt="${alt}"
          loading="lazy"
        >
        <img
          class="produto-imagem produto-imagem--frente"
          src="${imagemFrente}"
          data-image-primary="${imagemFrente}"
          data-image-secondary="${imagemVerso}"
          alt=""
          loading="lazy"
          aria-hidden="true"
        >
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

  cards.forEach((card) => {
    const filterKey = card.dataset.filterKey || "";
    const mostrar = filtroAtivo === "todos" || filterKey === filtroAtivo;

    card.classList.toggle("is-hidden-by-filter", !mostrar);
    card.hidden = !mostrar;
    card.setAttribute("aria-hidden", String(!mostrar));
  });

  const visiveis = cards.filter((card) => !card.classList.contains("is-hidden-by-filter")).length;

  if (vazio) {
    vazio.hidden = visiveis !== 0;
  }
}

function prepararImagensProduto(container) {
  const imagens = container.querySelectorAll(".produto-imagem");

  imagens.forEach((imagem) => {
    window.CatalogoUtils.registrarFallbackImagem(imagem, [
      imagem.dataset.imagePrimary,
      imagem.dataset.imageSecondary
    ]);
  });
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

  if (categoria === "camisas" && subcategoria === "cristas") {
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
