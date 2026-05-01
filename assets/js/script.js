const FILTRO_PADRAO = Object.freeze({
  categoria: "camisas",
  subcategoria: "",
  genero: "",
  label: "Camisas / Todas"
});

document.addEventListener("DOMContentLoaded", async () => {
  const shell = document.querySelector("#catalogo-shell");
  const sidebar = document.querySelector("#catalogo-sidebar");
  const grid = document.querySelector("#grid-produtos");
  const filtros = document.querySelector("#catalogo-filtros");
  const vazio = document.querySelector("#produtos-vazio");
  const labelAtiva = document.querySelector("#catalogo-active-label");
  const contadorAtivo = document.querySelector("#catalogo-active-count");

  if (!grid || !window.CatalogoUtils) {
    return;
  }

  let filtroAtivo = obterFiltroInicial(filtros);

  padronizarCardsFallback(grid);
  sincronizarFiltrosAtivos(filtros, filtroAtivo);
  prepararImagensProduto(grid);
  aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);

  const controleSidebar = configurarSidebarLayout({
    shell,
    sidebar,
    backdrop: document.querySelector("#catalogo-sidebar-backdrop"),
    mobileTrigger: document.querySelector("#sidebar-mobile-trigger"),
    mobileClose: document.querySelector("#sidebar-mobile-close"),
    collapseTrigger: document.querySelector("#sidebar-collapse"),
    railTrigger: document.querySelector("#sidebar-rail-button")
  });

  shell?.classList.add("is-ui-ready");

  configurarFiltros(filtros, (novoFiltro) => {
    filtroAtivo = novoFiltro;
    aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);
    controleSidebar.fecharMobile();
  });

  const source = grid.dataset.produtosSrc;

  if (!source) {
    return;
  }

  try {
    const produtos = await window.CatalogoUtils.carregarProdutos(source);

    if (!produtos.length) {
      aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);
      return;
    }

    grid.innerHTML = produtos.map(criarCardProduto).join("");
    configurarVariacoesCard(grid, produtos);
    prepararImagensProduto(grid);
    aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);
  } catch (error) {
    console.info("Catalogo usando fallback estatico.", error);
    prepararImagensProduto(grid);
    aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);
  }
});

function criarCardProduto(produto) {
  const utils = window.CatalogoUtils;
  const variacaoPadrao = produto.variacoes[0];
  const imagensCard = utils.resolverImagensCardProduto(produto, variacaoPadrao);
  const imagemPrimaria = utils.escapeAttribute(imagensCard.principal);
  const imagemSecundaria = utils.escapeAttribute(imagensCard.hover);
  const nome = utils.escapeHtml(produto.nome);
  const preco = utils.escapeHtml(produto.precoTexto);
  const destaque = utils.escapeHtml(produto.destaque);
  const detalhes = utils.escapeHtml(produto.detalhes);
  const alt = utils.escapeHtml(
    utils.criarAltImagemProduto(produto, variacaoPadrao, imagensCard.vistaPrincipal)
  );
  const produtoUrl = utils.escapeAttribute(utils.criarUrlProduto(produto.id));
  const mensagem = encodeURIComponent(utils.criarMensagemWhatsapp(produto, variacaoPadrao));
  const taxonomia = extrairTaxonomiaProduto(produto);
  const variacoesMarkup = criarSwatchesCard(produto, 0);

  return `
    <article
      class="produto produto-linkavel"
      data-product-id="${utils.escapeAttribute(produto.id)}"
      data-active-variation="0"
      data-category="${utils.escapeAttribute(taxonomia.categoria)}"
      data-subcategory="${utils.escapeAttribute(taxonomia.subcategoria)}"
      data-genero="${utils.escapeAttribute(taxonomia.genero)}"
    >
      <a class="produto-card-link" href="${produtoUrl}" aria-label="Ver detalhes de ${nome}"></a>
      <div class="produto-media">
        <img
          class="produto-imagem produto-imagem--verso"
          src="${imagemPrimaria}"
          data-image-primary="${imagemPrimaria}"
          data-image-secondary="${imagemSecundaria}"
          alt="${alt}"
          loading="lazy"
        >
        <img
          class="produto-imagem produto-imagem--frente"
          src="${imagemSecundaria}"
          data-image-primary="${imagemSecundaria}"
          data-image-secondary="${imagemPrimaria}"
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
        ${variacoesMarkup}
        <a class="botao" href="https://wa.me/${utils.WHATSAPP_NUMBER}?text=${mensagem}" target="_blank" rel="noreferrer">
          Comprar no WhatsApp
        </a>
      </div>
    </article>
  `;
}

function criarSwatchesCard(produto, indiceAtivo) {
  if (
    !Array.isArray(produto.variacoes) ||
    !produto.variacoes.length ||
    (produto.variacoes.length <= 1 && !produto.mostrarSwatches)
  ) {
    return "";
  }

  const utils = window.CatalogoUtils;
  const swatches = produto.variacoes
    .map((variacao, index) => {
      const ativo = indiceAtivo === index;

      return `
        <button
          type="button"
          class="produto-card-swatch${ativo ? " is-active" : ""}"
          data-variacao-index="${index}"
          title="${utils.escapeHtml(variacao.corLabel)}"
          aria-label="Selecionar cor ${utils.escapeHtml(variacao.corLabel)}"
          aria-pressed="${ativo}"
          style="--swatch-color: ${utils.escapeAttribute(variacao.hex)}"
        ></button>
      `;
    })
    .join("");

  return `
    <div class="produto-card-variacoes" role="group" aria-label="Cores disponiveis">
      ${swatches}
    </div>
  `;
}

function configurarVariacoesCard(container, produtos) {
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const cards = [...container.querySelectorAll(".produto[data-product-id]")];

  cards.forEach((card) => {
    const produto = produtosPorId.get(card.dataset.productId);

    if (
      !produto ||
      !Array.isArray(produto.variacoes) ||
      !produto.variacoes.length ||
      (produto.variacoes.length <= 1 && !produto.mostrarSwatches)
    ) {
      return;
    }

    atualizarVariacaoCard(card, produto, Number(card.dataset.activeVariation || "0"));

    card.querySelectorAll(".produto-card-swatch").forEach((botao) => {
      botao.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        atualizarVariacaoCard(card, produto, Number(botao.dataset.variacaoIndex || "0"));
      });
    });
  });
}

function atualizarVariacaoCard(card, produto, indiceVariacao) {
  const utils = window.CatalogoUtils;
  const variacao = produto.variacoes[indiceVariacao] || produto.variacoes[0];
  const imagensCard = utils.resolverImagensCardProduto(produto, variacao);
  const imagemPrincipal = card.querySelector(".produto-imagem--verso");
  const imagemHover = card.querySelector(".produto-imagem--frente");
  const whatsapp = card.querySelector(".botao");

  if (!imagemPrincipal || !imagemHover || !whatsapp) {
    return;
  }

  aplicarEstadoImagemCardFallback(imagemPrincipal, imagensCard.principal, imagensCard.hover);
  aplicarEstadoImagemCardFallback(imagemHover, imagensCard.hover, imagensCard.principal);

  imagemPrincipal.alt = utils.criarAltImagemProduto(produto, variacao, imagensCard.vistaPrincipal);
  imagemHover.alt = "";
  imagemHover.setAttribute("aria-hidden", "true");

  utils.registrarFallbackImagem(imagemPrincipal, [
    imagemPrincipal.dataset.imagePrimary,
    imagemPrincipal.dataset.imageSecondary
  ]);
  utils.registrarFallbackImagem(imagemHover, [
    imagemHover.dataset.imagePrimary,
    imagemHover.dataset.imageSecondary
  ]);

  whatsapp.href = `https://wa.me/${utils.WHATSAPP_NUMBER}?text=${encodeURIComponent(
    utils.criarMensagemWhatsapp(produto, variacao)
  )}`;

  card.dataset.activeVariation = String(indiceVariacao);

  card.querySelectorAll(".produto-card-swatch").forEach((botao) => {
    const ativo = Number(botao.dataset.variacaoIndex || "0") === indiceVariacao;
    botao.classList.toggle("is-active", ativo);
    botao.setAttribute("aria-pressed", String(ativo));
  });
}

function padronizarCardsFallback(container) {
  const utils = window.CatalogoUtils;
  const cards = [...container.querySelectorAll(".produto")];

  cards.forEach((card) => {
    const imagens = [...card.querySelectorAll(".produto-imagem")];
    const imagemPrincipal = imagens[0];
    const imagemHover = imagens[1];

    if (!imagemPrincipal || !imagemHover) {
      return;
    }

    const taxonomia = extrairTaxonomiaProduto(card.dataset);
    const titulo = card.querySelector(".info h2")?.textContent?.trim() || "Produto";
    const imagensCard = utils.resolverImagensCardPorArquivos(taxonomia, [
      imagemPrincipal.dataset.imagePrimary,
      imagemPrincipal.dataset.imageSecondary,
      imagemHover.dataset.imagePrimary,
      imagemHover.dataset.imageSecondary,
      imagemPrincipal.currentSrc || imagemPrincipal.src,
      imagemHover.currentSrc || imagemHover.src
    ]);

    aplicarEstadoImagemCardFallback(imagemPrincipal, imagensCard.principal, imagensCard.hover);
    aplicarEstadoImagemCardFallback(imagemHover, imagensCard.hover, imagensCard.principal);

    imagemPrincipal.alt = utils.criarAltImagemProduto(
      { nome: titulo },
      null,
      imagensCard.vistaPrincipal
    );
    imagemHover.alt = "";
    imagemHover.setAttribute("aria-hidden", "true");
  });
}

function aplicarEstadoImagemCardFallback(imagem, principal, secundaria) {
  imagem.src = principal;
  imagem.dataset.imagePrimary = principal;
  imagem.dataset.imageSecondary = secundaria;
}

function configurarFiltros(container, onChange) {
  if (!container) {
    return;
  }

  const botoes = [...container.querySelectorAll("[data-filter-category]")];

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const filtro = obterFiltroDoElemento(botao);
      sincronizarFiltrosAtivos(container, filtro);
      onChange(filtro);
    });
  });
}

function obterFiltroInicial(container) {
  if (!container) {
    return { ...FILTRO_PADRAO };
  }

  const elementoAtivo =
    container.querySelector("[data-filter-category][aria-current='true']") ||
    container.querySelector("[data-filter-category].is-active");

  return elementoAtivo ? obterFiltroDoElemento(elementoAtivo) : { ...FILTRO_PADRAO };
}

function sincronizarFiltrosAtivos(container, filtroAtivo) {
  if (!container) {
    return;
  }

  const botoes = [...container.querySelectorAll("[data-filter-category]")];
  const secoes = [...container.querySelectorAll(".catalogo-nav-section[data-category-root]")];
  const ramos = [...container.querySelectorAll(".catalogo-nav-branch[data-subcategory-root]")];

  botoes.forEach((botao) => {
    const filtroBotao = obterFiltroDoElemento(botao);
    const isBranch = botao.classList.contains("catalogo-nav-item--branch");
    const correspondeCategoria = filtroBotao.categoria === filtroAtivo.categoria;
    const correspondeSubcategoria =
      !filtroBotao.subcategoria || filtroBotao.subcategoria === filtroAtivo.subcategoria;
    const correspondeGenero = !filtroBotao.genero || filtroBotao.genero === filtroAtivo.genero;
    const pertenceAoCaminho = correspondeCategoria && correspondeSubcategoria && correspondeGenero;
    const isExato =
      !isBranch &&
      filtroBotao.categoria === filtroAtivo.categoria &&
      filtroBotao.subcategoria === filtroAtivo.subcategoria &&
      filtroBotao.genero === filtroAtivo.genero;

    botao.classList.toggle("is-active", isExato);
    botao.classList.toggle("is-branch-active", isBranch && pertenceAoCaminho);
    botao.setAttribute("aria-current", isExato ? "true" : "false");
  });

  secoes.forEach((secao) => {
    const categoriaRoot = normalizarTaxonomiaValor(secao.dataset.categoryRoot);
    secao.classList.toggle("is-section-active", categoriaRoot === filtroAtivo.categoria);
  });

  ramos.forEach((ramo) => {
    const subcategoriaRoot = normalizarTaxonomiaValor(ramo.dataset.subcategoryRoot);
    const ativo =
      filtroAtivo.categoria === "camisas" &&
      subcategoriaRoot &&
      subcategoriaRoot === filtroAtivo.subcategoria;

    ramo.classList.toggle("is-branch-current", ativo);
  });
}

function aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo) {
  const cards = [...grid.querySelectorAll(".produto")];

  if (!cards.length) {
    atualizarEstadoCatalogo(filtroAtivo, 0, vazio, labelAtiva, contadorAtivo);
    return;
  }

  let visiveis = 0;

  cards.forEach((card) => {
    const taxonomia = extrairTaxonomiaProduto(card.dataset);
    const mostrar = correspondeAoFiltro(taxonomia, filtroAtivo);

    card.classList.toggle("is-hidden-by-filter", !mostrar);
    card.hidden = !mostrar;
    card.setAttribute("aria-hidden", String(!mostrar));

    if (mostrar) {
      visiveis += 1;
    }
  });

  atualizarEstadoCatalogo(filtroAtivo, visiveis, vazio, labelAtiva, contadorAtivo);
}

function atualizarEstadoCatalogo(filtroAtivo, visiveis, vazio, labelAtiva, contadorAtivo) {
  if (labelAtiva) {
    labelAtiva.textContent = filtroAtivo.label;
  }

  if (contadorAtivo) {
    contadorAtivo.textContent = formatarContagem(visiveis);
  }

  if (!vazio) {
    return;
  }

  vazio.hidden = visiveis !== 0;

  if (visiveis === 0) {
    vazio.textContent = `Nenhum produto encontrado em ${filtroAtivo.label}.`;
    return;
  }

  vazio.textContent = "Nenhum produto encontrado nesta categoria.";
}

function correspondeAoFiltro(taxonomiaProduto, filtroAtivo) {
  if (!filtroAtivo.categoria) {
    return true;
  }

  if (taxonomiaProduto.categoria !== filtroAtivo.categoria) {
    return false;
  }

  if (filtroAtivo.subcategoria && taxonomiaProduto.subcategoria !== filtroAtivo.subcategoria) {
    return false;
  }

  if (filtroAtivo.genero && taxonomiaProduto.genero !== filtroAtivo.genero) {
    return false;
  }

  return true;
}

function obterFiltroDoElemento(elemento) {
  return {
    categoria: normalizarTaxonomiaValor(elemento.dataset.filterCategory),
    subcategoria: normalizarTaxonomiaValor(elemento.dataset.filterSubcategory),
    genero: normalizarTaxonomiaValor(elemento.dataset.filterGenero),
    label: String(elemento.dataset.filterLabel || "Catalogo")
  };
}

function extrairTaxonomiaProduto(origem) {
  let categoria = normalizarTaxonomiaValor(origem.categoria ?? origem.category);
  let subcategoria = normalizarTaxonomiaValor(origem.subcategoria ?? origem.subcategory);
  let genero = normalizarTaxonomiaValor(origem.genero ?? origem.gender);

  if (categoria === "camisetas-cristas") {
    categoria = "camisas";
    subcategoria = "cristas";
  }

  if (categoria === "camisas" && subcategoria !== "cristas") {
    genero = "";
  }

  return {
    categoria,
    subcategoria,
    genero
  };
}

function normalizarTaxonomiaValor(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
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

function configurarSidebarLayout(elementos) {
  const {
    shell,
    sidebar,
    backdrop,
    mobileTrigger,
    mobileClose,
    collapseTrigger,
    railTrigger
  } = elementos;

  if (!shell) {
    return {
      fecharMobile() {}
    };
  }

  const mediaDesktop =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 901px)")
      : { matches: window.innerWidth >= 901 };
  const viewportEhDesktop = () => window.innerWidth >= 901 || mediaDesktop.matches;
  const estado = {
    colapsada: shell.classList.contains("is-sidebar-collapsed"),
    mobileAberta: false
  };

  const sincronizarLayout = () => {
    const desktopAtivo = viewportEhDesktop();

    shell.classList.toggle("is-sidebar-collapsed", desktopAtivo && estado.colapsada);
    shell.classList.toggle("is-mobile-sidebar-open", !desktopAtivo && estado.mobileAberta);
    document.body.classList.toggle("is-mobile-sidebar-open", !desktopAtivo && estado.mobileAberta);

    if (sidebar) {
      sidebar.setAttribute("aria-hidden", String(!desktopAtivo && !estado.mobileAberta));
    }

    if (backdrop) {
      backdrop.hidden = desktopAtivo || !estado.mobileAberta;
    }

    if (mobileTrigger) {
      mobileTrigger.setAttribute("aria-expanded", String(!desktopAtivo && estado.mobileAberta));
    }

    if (mobileClose) {
      mobileClose.setAttribute("aria-expanded", String(!desktopAtivo && estado.mobileAberta));
    }

    if (collapseTrigger) {
      collapseTrigger.setAttribute("aria-expanded", String(!(desktopAtivo && estado.colapsada)));
    }

    if (railTrigger) {
      railTrigger.setAttribute("aria-expanded", String(!(desktopAtivo && estado.colapsada)));
    }
  };

  const definirSidebarMobile = (aberta) => {
    estado.mobileAberta = aberta;
    sincronizarLayout();
  };

  const definirColapsoDesktop = (colapsada) => {
    estado.colapsada = colapsada;
    sincronizarLayout();
  };

  const sincronizarViewport = () => {
    if (viewportEhDesktop()) {
      estado.mobileAberta = false;
    }

    sincronizarLayout();
  };

  collapseTrigger?.addEventListener("click", () => {
    if (!viewportEhDesktop()) {
      return;
    }

    definirColapsoDesktop(!estado.colapsada);
  });

  railTrigger?.addEventListener("click", () => {
    if (!viewportEhDesktop()) {
      return;
    }

    definirColapsoDesktop(false);
  });

  mobileTrigger?.addEventListener("click", () => {
    if (viewportEhDesktop()) {
      return;
    }

    definirSidebarMobile(true);
  });

  mobileClose?.addEventListener("click", () => {
    definirSidebarMobile(false);
  });

  backdrop?.addEventListener("click", () => {
    definirSidebarMobile(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || viewportEhDesktop() || !estado.mobileAberta) {
      return;
    }

    definirSidebarMobile(false);
  });

  const reagirMudancaViewport = (event) => {
    if (event.matches) {
      estado.mobileAberta = false;
    }

    sincronizarLayout();
  };

  window.addEventListener("resize", sincronizarViewport, { passive: true });
  window.addEventListener("orientationchange", sincronizarViewport);
  window.addEventListener("pageshow", sincronizarViewport);

  if (typeof mediaDesktop.addEventListener === "function") {
    mediaDesktop.addEventListener("change", reagirMudancaViewport);
  } else if (typeof mediaDesktop.addListener === "function") {
    mediaDesktop.addListener(reagirMudancaViewport);
  }

  sincronizarLayout();

  return {
    fecharMobile() {
      definirSidebarMobile(false);
    }
  };
}

function formatarContagem(total) {
  return `${total} ${total === 1 ? "produto" : "produtos"}`;
}
