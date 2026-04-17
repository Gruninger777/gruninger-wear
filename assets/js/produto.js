document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("#produto-detalhe");
  const estado = document.querySelector("#produto-estado");
  const conteudo = document.querySelector("#produto-conteudo");

  if (!root || !estado || !conteudo || !window.CatalogoUtils) {
    return;
  }

  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    mostrarEstado("Produto não informado.");
    return;
  }

  try {
    const produtos = await window.CatalogoUtils.carregarProdutos(root.dataset.produtosSrc);
    const produto = window.CatalogoUtils.encontrarProdutoPorId(produtos, id);

    if (!produto) {
      mostrarEstado("Produto não encontrado.");
      return;
    }

    renderizarProduto(produto);
  } catch (error) {
    console.error(error);
    mostrarEstado("Não foi possível carregar este produto agora.");
  }

  function mostrarEstado(texto) {
    estado.textContent = texto;
    estado.hidden = false;
    conteudo.hidden = true;
  }

  function renderizarProduto(produto) {
    const categoria = document.querySelector("#produto-categoria");
    const nome = document.querySelector("#produto-nome");
    const preco = document.querySelector("#produto-preco");
    const destaque = document.querySelector("#produto-destaque");
    const descricao = document.querySelector("#produto-descricao");
    const detalhes = document.querySelector("#produto-detalhes");
    const corAtual = document.querySelector("#produto-cor-atual");
    const variacoes = document.querySelector("#produto-variacoes");
    const swatches = document.querySelector("#produto-swatches");
    const imagemPrincipal = document.querySelector("#produto-imagem-principal");
    const miniaturas = document.querySelector("#produto-miniaturas");
    const whatsapp = document.querySelector("#produto-whatsapp");

    let indiceVariacao = 0;
    let vistaAtiva = produto.variacoes[0]?.vistaInicial || "verso";

    document.title = `${produto.nome} | Grüninger Wear`;

    categoria.textContent = [produto.categoria, produto.subcategoria]
      .filter(Boolean)
      .map((item) => window.CatalogoUtils.humanizar(item))
      .join(" / ");

    nome.textContent = produto.nome;
    preco.textContent = produto.precoTexto;
    destaque.textContent = produto.destaque;
    descricao.textContent = produto.descricao;
    detalhes.textContent = produto.detalhes;

    function atualizarProduto() {
      const variacao = produto.variacoes[indiceVariacao];
      const vista = obterVistaAtiva(variacao);
      const imagemAtual = vista.imagem;

      imagemPrincipal.src = imagemAtual;
      imagemPrincipal.alt = montarAltImagem(produto, variacao, vista);
      window.CatalogoUtils.registrarFallbackImagem(imagemPrincipal, [
        vista.imagem,
        vista.secundaria,
        window.CatalogoUtils.obterImagemPrincipal(variacao),
        window.CatalogoUtils.obterImagemHover(variacao)
      ]);

      corAtual.textContent = `Cor selecionada: ${variacao.corLabel}`;
      whatsapp.href = `https://wa.me/${window.CatalogoUtils.WHATSAPP_NUMBER}?text=${encodeURIComponent(
        window.CatalogoUtils.criarMensagemWhatsapp(produto, variacao)
      )}`;

      renderizarMiniaturas(variacao);
      renderizarSwatches();
    }

    function renderizarMiniaturas(variacao) {
      const vistas = Array.isArray(variacao.galeria) && variacao.galeria.length
        ? variacao.galeria
        : [
            {
              id: "verso",
              label: "Verso",
              imagem: window.CatalogoUtils.obterImagemPrincipal(variacao),
              secundaria: window.CatalogoUtils.obterImagemHover(variacao)
            },
            {
              id: "frente",
              label: "Frente",
              imagem: window.CatalogoUtils.obterImagemHover(variacao),
              secundaria: window.CatalogoUtils.obterImagemPrincipal(variacao)
            }
          ];

      miniaturas.innerHTML = vistas
        .map(
          (vista) => `
            <button
              type="button"
              class="produto-miniatura${vistaAtiva === vista.id ? " is-active" : ""}"
              data-view="${vista.id}"
              aria-pressed="${vistaAtiva === vista.id}"
            >
              <img
                src="${window.CatalogoUtils.escapeAttribute(vista.imagem)}"
                data-image-primary="${window.CatalogoUtils.escapeAttribute(vista.imagem)}"
                data-image-secondary="${window.CatalogoUtils.escapeAttribute(vista.secundaria)}"
                alt="${window.CatalogoUtils.escapeHtml(`${produto.nome} ${vista.label.toLowerCase()}`)}"
              >
              <span>${window.CatalogoUtils.escapeHtml(vista.label)}</span>
            </button>
          `
        )
        .join("");

      miniaturas.querySelectorAll(".produto-miniatura").forEach((botao) => {
        botao.addEventListener("click", () => {
          vistaAtiva = botao.dataset.view;
          atualizarProduto();
        });
      });

      miniaturas.querySelectorAll("img").forEach((imagem) => {
        window.CatalogoUtils.registrarFallbackImagem(imagem, [
          imagem.dataset.imagePrimary,
          imagem.dataset.imageSecondary
        ]);
      });
    }

    function renderizarSwatches() {
      if (produto.variacoes.length <= 1) {
        variacoes.hidden = true;
        return;
      }

      variacoes.hidden = false;

      swatches.innerHTML = produto.variacoes
        .map(
          (variacao, index) => `
            <button
              type="button"
              class="produto-swatch${indiceVariacao === index ? " is-active" : ""}"
              data-variacao-index="${index}"
              title="${window.CatalogoUtils.escapeHtml(variacao.corLabel)}"
              aria-label="Selecionar cor ${window.CatalogoUtils.escapeHtml(variacao.corLabel)}"
              aria-pressed="${indiceVariacao === index}"
              style="--swatch-color: ${window.CatalogoUtils.escapeAttribute(variacao.hex)}"
            ></button>
          `
        )
        .join("");

      swatches.querySelectorAll(".produto-swatch").forEach((botao) => {
        botao.addEventListener("click", () => {
          indiceVariacao = Number(botao.dataset.variacaoIndex);
          vistaAtiva = produto.variacoes[indiceVariacao]?.vistaInicial || "verso";
          atualizarProduto();
        });
      });
    }

    function obterVistaAtiva(variacao) {
      const vistas = Array.isArray(variacao.galeria) && variacao.galeria.length ? variacao.galeria : [];
      return vistas.find((vista) => vista.id === vistaAtiva) || vistas[0] || {
        id: "verso",
        label: "Verso",
        imagem: window.CatalogoUtils.obterImagemPrincipal(variacao),
        secundaria: window.CatalogoUtils.obterImagemHover(variacao)
      };
    }

    function montarAltImagem(produtoAtual, variacaoAtual, vistaAtual) {
      const cor =
        variacaoAtual.cor &&
        variacaoAtual.cor.toLowerCase() !== "unica" &&
        variacaoAtual.cor.toLowerCase() !== "\u00fanica"
          ? ` ${variacaoAtual.corLabel}`
          : "";

      return `${produtoAtual.nome}${cor} ${vistaAtual.label}`.trim();
    }

    atualizarProduto();
    estado.hidden = true;
    conteudo.hidden = false;
  }
});
