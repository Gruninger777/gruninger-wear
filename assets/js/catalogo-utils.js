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

    return {
      cor,
      corLabel: humanizar(cor),
      hex: variacao.hex || resolverCor(cor),
      imagemFrente,
      imagemVerso
    };
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
    return variacao.imagemVerso || variacao.imagemFrente || DEFAULT_IMAGE;
  }

  function obterImagemHover(variacao) {
    return variacao.imagemFrente || variacao.imagemVerso || DEFAULT_IMAGE;
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
