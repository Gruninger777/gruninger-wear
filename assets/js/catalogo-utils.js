(function () {
  const WHATSAPP_NUMBER = "5517988090379";
  const DEFAULT_IMAGE = "assets/img/produtos/camisetas/camiseta-modelo.svg";
  const COLOR_MAP = {
    preta: "#111111",
    branco: "#f3f3f3",
    branca: "#f3f3f3",
    grafite: "#2d2d2d",
    cinza: "#737373",
    chumbo: "#3a3a3a",
    areia: "#c8b692",
    bege: "#ccb79c",
    verde: "#465542",
    azul: "#29466c",
    marinho: "#1d2b44",
    vermelha: "#8b1f1f",
    vermelho: "#8b1f1f"
  };
  const CARD_IMAGE_RULES = Object.freeze({
    sports: Object.freeze({
      principal: "frente",
      hover: "verso"
    }),
    standard: Object.freeze({
      principal: "verso",
      hover: "frente"
    }),
    fallback: Object.freeze({
      principal: "frente",
      hover: "verso"
    })
  });

  function normalizarRegraCard(origem) {
    const regra =
      origem?.regraCard ||
      origem?.regra_card ||
      origem?.cardRule ||
      origem?.card_rule ||
      origem?.card ||
      null;
    const principal = normalizarTaxonomiaValor(
      regra?.principal ?? origem?.card_principal ?? origem?.cardPrincipal
    );
    const hover = normalizarTaxonomiaValor(regra?.hover ?? origem?.card_hover ?? origem?.cardHover);

    if (!principal || !hover) {
      return null;
    }

    return {
      principal,
      hover
    };
  }

  async function carregarProdutos(source) {
    const response = await fetch(source, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Falha ao carregar ${source}: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(normalizarProduto);
  }

  function normalizarProduto(produto) {
    const nome = String(produto.nome || "Produto");

    return {
      id: String(produto.id || criarSlug(nome)),
      nome,
      preco: produto.preco ?? "Consulte",
      precoTexto: formatarPreco(produto.preco ?? "Consulte"),
      categoria: produto.categoria || "",
      subcategoria: produto.subcategoria || "",
      genero: produto.genero || "",
      destaque: produto.destaque || "Qualidade premium",
      detalhes: produto.detalhes || "Consulte disponibilidade",
      descricao: produto.descricao || "Peça disponível no catálogo Grüninger Wear.",
      alt: produto.alt || `${nome} Grüninger Wear`,
      mensagem: produto.mensagem || "",
      mostrarSwatches:
        produto.mostrarSwatches === true ||
        produto.mostrar_swatches === true ||
        produto.forceSwatches === true ||
        produto.force_swatches === true,
      regraCard: normalizarRegraCard(produto),
      variacoes: normalizarVariacoes(produto)
    };
  }

  function normalizarVariacoes(produto) {
    if (Array.isArray(produto.variacoes) && produto.variacoes.length > 0) {
      return produto.variacoes.map((variacao) => normalizarVariacao(variacao, produto));
    }

    return [normalizarVariacao(produto, produto)];
  }

  function normalizarVariacao(variacao, produto) {
    const imagemFrente =
      variacao.imagem_frente ||
      variacao.imagemFrente ||
      variacao.imagem ||
      produto.imagem_frente ||
      produto.imagemFrente ||
      produto.imagem ||
      DEFAULT_IMAGE;

    const imagemVerso =
      variacao.imagem_verso ||
      variacao.imagemVerso ||
      produto.imagem_verso ||
      produto.imagemVerso ||
      variacao.imagem ||
      produto.imagem ||
      imagemFrente;

    const cor = String(variacao.cor || "unica");
    const galeria = normalizarGaleria(variacao, produto, imagemFrente, imagemVerso);
    const vistaInicial = resolverVistaInicial(variacao, produto, galeria);

    return {
      cor,
      corLabel: humanizar(cor),
      hex: variacao.hex || resolverCor(cor),
      mensagem: variacao.mensagem || "",
      imagemFrente,
      imagemVerso,
      galeria,
      vistaInicial
    };
  }

  function normalizarTaxonomiaValor(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase();
  }

  function normalizarTaxonomiaProduto(produto) {
    let categoria = normalizarTaxonomiaValor(produto?.categoria ?? produto?.category);
    let subcategoria = normalizarTaxonomiaValor(produto?.subcategoria ?? produto?.subcategory);
    let genero = normalizarTaxonomiaValor(produto?.genero ?? produto?.gender);

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

  function normalizarTextoBusca(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function identificarTipoMidiaProduto(origem) {
    const assinatura = normalizarTextoBusca(
      Array.isArray(origem)
        ? origem.filter(Boolean).join(" ")
        : [
            origem?.tipo,
            origem?.id,
            origem?.label,
            origem?.imagem,
            origem?.src,
            typeof origem === "string" ? origem : ""
          ]
            .filter(Boolean)
            .join(" ")
    );
    const temModelo = /(^|[\s/_-])(modelo|manequim)(?=$|[\s/_-])/.test(assinatura);
    const temVerso = /(^|[\s/_-])(verso|costas|back)(?=$|[\s/_-])/.test(assinatura);
    const temFrente = /(^|[\s/_-])(frente|front)(?=$|[\s/_-])/.test(assinatura);

    if (temModelo && temVerso) {
      return "modelo-verso";
    }

    if (temModelo && temFrente) {
      return "modelo-frente";
    }

    if (temVerso) {
      return "verso";
    }

    if (temFrente) {
      return "frente";
    }

    return "";
  }

  function normalizarGaleria(variacao, produto, imagemFrente, imagemVerso) {
    const origemGaleria =
      (Array.isArray(variacao.galeria) && variacao.galeria.length ? variacao.galeria : null) ||
      (Array.isArray(produto.galeria) && produto.galeria.length ? produto.galeria : null);

    if (!origemGaleria) {
      return [
        {
          id: "frente",
          label: "Frente",
          imagem: imagemFrente,
          secundaria: imagemVerso,
          tipo: "frente"
        },
        {
          id: "verso",
          label: "Verso",
          imagem: imagemVerso,
          secundaria: imagemFrente,
          tipo: "verso"
        }
      ].filter((vista) => vista.imagem);
    }

    return origemGaleria
      .map((item, index) => {
        const id = String(item.id || `vista-${index + 1}`)
          .trim()
          .toLowerCase();
        const label = String(item.label || humanizar(id) || `Vista ${index + 1}`).trim();
        const imagem = String(item.imagem || item.src || DEFAULT_IMAGE);
        const secundaria = String(
          item.secundaria ||
            item.imagem_secundaria ||
            item.imagemSecundaria ||
            imagemFrente ||
            imagemVerso ||
            DEFAULT_IMAGE
        );

        return {
          id,
          label,
          imagem,
          secundaria,
          tipo: identificarTipoMidiaProduto({ id, label, imagem })
        };
      })
      .filter((vista) => vista.imagem);
  }

  function resolverVistaInicial(variacao, produto, galeria) {
    const vistaSolicitada = String(
      variacao.vista_inicial ||
        variacao.vistaInicial ||
        produto.vista_inicial ||
        produto.vistaInicial ||
        ""
    )
      .trim()
      .toLowerCase();

    if (vistaSolicitada) {
      const vistaCorrespondente = galeria.find(
        (vista) => vista.id === vistaSolicitada || vista.tipo === vistaSolicitada
      );

      if (vistaCorrespondente) {
        return vistaCorrespondente.id;
      }
    }

    return galeria[0]?.id || "frente";
  }

  function resolverRegraImagemCard(produto) {
    const regraCustomizada = normalizarRegraCard(produto);

    if (regraCustomizada) {
      return regraCustomizada;
    }

    const taxonomia = normalizarTaxonomiaProduto(produto);
    const nome = normalizarTextoBusca(produto?.nome);

    if (taxonomia.subcategoria === "times") {
      return CARD_IMAGE_RULES.sports;
    }

    if (taxonomia.categoria === "camisas" || /\bcamis(a|eta)s?\b/.test(nome)) {
      return CARD_IMAGE_RULES.standard;
    }

    return CARD_IMAGE_RULES.fallback;
  }

  function criarVistaVirtual(tipo, variacao) {
    const imagem =
      tipo === "frente"
        ? variacao?.imagemFrente
        : tipo === "verso"
          ? variacao?.imagemVerso
          : "";

    if (!imagem) {
      return null;
    }

    return {
      id: tipo,
      tipo,
      label: humanizar(tipo),
      imagem,
      secundaria: tipo === "frente" ? variacao?.imagemVerso || imagem : variacao?.imagemFrente || imagem
    };
  }

  function encontrarVistaEmColecao(colecao, tipoDesejado, imagemIgnorada = "") {
    return (
      (colecao || []).find((vista) => {
        const tipoVista = vista.tipo || identificarTipoMidiaProduto(vista);

        return (
          vista.imagem &&
          vista.imagem !== imagemIgnorada &&
          (tipoVista === tipoDesejado || vista.id === tipoDesejado)
        );
      }) || null
    );
  }

  function encontrarVistaPorTipo(variacao, tipoDesejado) {
    const galeria = Array.isArray(variacao?.galeria) ? variacao.galeria : [];
    return encontrarVistaEmColecao(galeria, tipoDesejado) || criarVistaVirtual(tipoDesejado, variacao);
  }

  function encontrarVistaAlternativaCard(variacao, vistaAtual) {
    const galeria = Array.isArray(variacao?.galeria) ? variacao.galeria : [];
    const imagemAtual = vistaAtual?.imagem || "";

    return (
      encontrarVistaEmColecao(galeria, "frente", imagemAtual) ||
      encontrarVistaEmColecao(galeria, "verso", imagemAtual) ||
      galeria.find((vista) => vista.imagem && vista.imagem !== imagemAtual) ||
      null
    );
  }

  function resolverImagensCardProduto(produto, variacao) {
    const regra = resolverRegraImagemCard(produto);
    const vistaPrincipal =
      encontrarVistaPorTipo(variacao, regra.principal) ||
      criarVistaVirtual("frente", variacao) ||
      criarVistaVirtual("verso", variacao);
    const vistaHover =
      encontrarVistaPorTipo(variacao, regra.hover) ||
      encontrarVistaAlternativaCard(variacao, vistaPrincipal) ||
      vistaPrincipal;

    return {
      principal: vistaPrincipal?.imagem || DEFAULT_IMAGE,
      hover: vistaHover?.imagem || vistaPrincipal?.secundaria || DEFAULT_IMAGE,
      vistaPrincipal,
      vistaHover,
      regra
    };
  }

  function resolverImagensCardPorArquivos(produto, arquivos) {
    const regra = resolverRegraImagemCard(produto);
    const vistas = [...new Set((arquivos || []).filter(Boolean).map(String))].map((imagem, index) => ({
      id: `arquivo-${index + 1}`,
      tipo: identificarTipoMidiaProduto(imagem),
      label: "",
      imagem
    }));
    const vistaPrincipal = encontrarVistaEmColecao(vistas, regra.principal) || vistas[0] || null;
    const vistaHover =
      encontrarVistaEmColecao(vistas, regra.hover, vistaPrincipal?.imagem || "") ||
      vistas.find((vista) => vista.imagem !== vistaPrincipal?.imagem) ||
      vistaPrincipal;

    return {
      principal: vistaPrincipal?.imagem || DEFAULT_IMAGE,
      hover: vistaHover?.imagem || vistaPrincipal?.imagem || DEFAULT_IMAGE,
      vistaPrincipal,
      vistaHover,
      regra
    };
  }

  function criarAltImagemProduto(produto, variacao, vista) {
    const nome = String(produto?.nome || "Produto").trim();
    const tipoVista = vista?.tipo || identificarTipoMidiaProduto(vista);
    const cor =
      variacao &&
      variacao.cor &&
      normalizarTextoBusca(variacao.cor) !== "unica"
        ? ` ${humanizar(variacao.cor).toLowerCase()}`
        : "";
    const vistaTexto = tipoVista ? ` ${humanizar(tipoVista).toLowerCase()}` : "";

    return `${nome}${cor}${vistaTexto}`.trim();
  }

  function resolverCor(cor) {
    return COLOR_MAP[String(cor || "").toLowerCase()] || "#9a9a9a";
  }

  function criarMensagemWhatsapp(produto, variacao) {
    const mensagemCustomizada = variacao?.mensagem || produto?.mensagem;

    if (mensagemCustomizada) {
      return String(mensagemCustomizada);
    }

    const nome = typeof produto === "string" ? produto : produto.nome;
    const cor =
      variacao &&
      variacao.cor &&
      variacao.cor.toLowerCase() !== "unica" &&
      variacao.cor.toLowerCase() !== "única"
        ? ` na cor ${humanizar(variacao.cor).toLowerCase()}`
        : "";

    return `Olá! Tenho interesse na peça ${nome}${cor}. Quais tamanhos estão disponíveis?`;
  }

  function obterImagemPrincipal(variacao) {
    return variacao.imagemFrente || variacao.imagemVerso || DEFAULT_IMAGE;
  }

  function obterImagemHover(variacao) {
    return variacao.imagemVerso || variacao.imagemFrente || DEFAULT_IMAGE;
  }

  function registrarFallbackImagem(element, sources) {
    if (!element) {
      return;
    }

    const fila = [...new Set([...(sources || []), DEFAULT_IMAGE].filter(Boolean).map(String))];

    if (!fila.length) {
      return;
    }

    element.dataset.fallbackQueue = JSON.stringify(fila);
    element.dataset.fallbackIndex = "0";

    if (element.dataset.fallbackHandlerAttached === "true") {
      return;
    }

    element.dataset.fallbackHandlerAttached = "true";
    element.addEventListener("error", avancarFallbackImagem);
  }

  function avancarFallbackImagem(event) {
    const element = event.currentTarget;
    const fila = JSON.parse(element.dataset.fallbackQueue || "[]");
    const proximoIndice = Number(element.dataset.fallbackIndex || "0") + 1;

    if (proximoIndice >= fila.length) {
      return;
    }

    element.dataset.fallbackIndex = String(proximoIndice);
    element.src = fila[proximoIndice];
  }

  function formatarPreco(preco) {
    if (typeof preco === "number") {
      return formatarMoeda(preco);
    }

    const texto = String(preco).trim();

    if (/^R\$/i.test(texto)) {
      return texto;
    }

    const numero = Number(
      texto
        .replace(/[^\d,.-]/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".")
    );

    return Number.isFinite(numero) ? formatarMoeda(numero) : texto;
  }

  function formatarMoeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);
  }

  function criarUrlProduto(id) {
    return `produto.html?id=${encodeURIComponent(id)}`;
  }

  function encontrarProdutoPorId(produtos, id) {
    return produtos.find((produto) => produto.id === id) || null;
  }

  function humanizar(texto) {
    return String(texto || "")
      .replace(/[-_]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join(" ");
  }

  function criarSlug(texto) {
    return String(texto || "produto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return String(value).replaceAll('"', "&quot;");
  }

  window.CatalogoUtils = {
    WHATSAPP_NUMBER,
    DEFAULT_IMAGE,
    carregarProdutos,
    normalizarProduto,
    normalizarTaxonomiaProduto,
    identificarTipoMidiaProduto,
    resolverRegraImagemCard,
    resolverImagensCardProduto,
    resolverImagensCardPorArquivos,
    criarAltImagemProduto,
    criarMensagemWhatsapp,
    obterImagemPrincipal,
    obterImagemHover,
    registrarFallbackImagem,
    formatarPreco,
    criarUrlProduto,
    encontrarProdutoPorId,
    humanizar,
    escapeHtml,
    escapeAttribute
  };
})();
