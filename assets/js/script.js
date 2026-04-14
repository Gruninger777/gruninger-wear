const FILTRO_PADRAO = Object.freeze({
  categoria: "camisas",
  subcategoria: "",
  genero: "",
  label: "Camisas / Todas"
});

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector("#grid-produtos");
  const filtros = document.querySelector("#catalogo-filtros");
  const vazio = document.querySelector("#produtos-vazio");
  const labelAtiva = document.querySelector("#catalogo-active-label");
  const contadorAtivo = document.querySelector("#catalogo-active-count");

  if (!grid || !window.CatalogoUtils) {
    return;
  }

  const controleSidebar = configurarSidebarLayout({
    shell: document.querySelector("#catalogo-shell"),
    backdrop: document.querySelector("#catalogo-sidebar-backdrop"),
    mobileTrigger: document.querySelector("#sidebar-mobile-trigger"),
    mobileClose: document.querySelector("#sidebar-mobile-close"),
    collapseTrigger: document.querySelector("#sidebar-collapse"),
    railTrigger: document.querySelector("#sidebar-rail-button")
  });

  let filtroAtivo = { ...FILTRO_PADRAO };

  configurarFiltros(filtros, (novoFiltro) => {
    filtroAtivo = novoFiltro;
    aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);
    controleSidebar.fecharMobile();
  });

  sincronizarFiltrosAtivos(filtros, filtroAtivo);
  prepararImagensProduto(grid);
  aplicarFiltro(grid, filtroAtivo, vazio, labelAtiva, contadorAtivo);

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
  const imagemVerso = utils.escapeAttribute(utils.obterImagemPrincipal(variacaoPadrao));
  const imagemFrente = utils.escapeAttribute(utils.obterImagemHover(variacaoPadrao));
  const nome = utils.escapeHtml(produto.nome);
  const preco = utils.escapeHtml(produto.precoTexto);
  const destaque = utils.escapeHtml(produto.destaque);
  const detalhes = utils.escapeHtml(produto.detalhes);
  const alt = utils.escapeHtml(produto.alt || `${produto.nome} ${variacaoPadrao.corLabel}`.trim());
  const produtoUrl = utils.escapeAttribute(utils.criarUrlProduto(produto.id));
  const mensagem = encodeURIComponent(utils.criarMensagemWhatsapp(produto, variacaoPadrao));
  const taxonomia = extrairTaxonomiaProduto(produto);

  return `
    <article
      class="produto produto-linkavel"
      data-category="${utils.escapeAttribute(taxonomia.categoria)}"
      data-subcategory="${utils.escapeAttribute(taxonomia.subcategoria)}"
      data-genero="${utils.escapeAttribute(taxonomia.genero)}"
    >
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

  const botoes = [...container.querySelectorAll("[data-filter-category]")];

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const filtro = obterFiltroDoElemento(botao);
      sincronizarFiltrosAtivos(container, filtro);
      onChange(filtro);
    });
  });
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

  const mediaDesktop = window.matchMedia("(min-width: 901px)");
  const estado = {
    colapsada: mediaDesktop.matches && window.innerWidth < 1220,
    mobileAberta: false
  };

  const sincronizarLayout = () => {
    const desktopAtivo = mediaDesktop.matches;

    shell.classList.toggle("is-sidebar-collapsed", desktopAtivo && estado.colapsada);
    shell.classList.toggle("is-mobile-sidebar-open", !desktopAtivo && estado.mobileAberta);
    document.body.classList.toggle("is-mobile-sidebar-open", !desktopAtivo && estado.mobileAberta);

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

  collapseTrigger?.addEventListener("click", () => {
    if (!mediaDesktop.matches) {
      return;
    }

    definirColapsoDesktop(!estado.colapsada);
  });

  railTrigger?.addEventListener("click", () => {
    if (!mediaDesktop.matches) {
      return;
    }

    definirColapsoDesktop(false);
  });

  mobileTrigger?.addEventListener("click", () => {
    if (mediaDesktop.matches) {
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
    if (event.key !== "Escape" || mediaDesktop.matches || !estado.mobileAberta) {
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
