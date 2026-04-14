const WHATSAPP_NUMBER = "5517988090379";
const DEFAULT_IMAGE = "assets/img/produtos/camisetas/camiseta-modelo.svg";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("#grid-produtos");

  if (!grid) {
    return;
  }

  carregarProdutos(grid);
});

async function carregarProdutos(grid) {
  const source = grid.dataset.produtosSrc;

  if (!source) {
    return;
  }

  try {
    // Em file:// o fetch pode falhar; nesse caso o card estático continua visível.
    const response = await fetch(source, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Falha ao carregar ${source}: ${response.status}`);
    }

    const produtos = await response.json();

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return;
    }

    grid.innerHTML = produtos.map(criarCardProduto).join("");
  } catch (error) {
    console.info("Catálogo usando fallback estático.", error);
  }
}

function criarCardProduto(produto) {
  const nome = escapeHtml(produto.nome || "Produto");
  const preco = escapeHtml(produto.preco || "Consulte");
  const detalhes = escapeHtml(produto.detalhes || "Consulte disponibilidade");
  const alt = escapeHtml(produto.alt || produto.nome || "Produto Grüninger Wear");
  const imagem = escapeAttribute(produto.imagem || DEFAULT_IMAGE);
  const mensagem = encodeURIComponent(produto.mensagem || `Tenho interesse na ${produto.nome || "peça"}`);

  return `
    <article class="produto">
      <img src="${imagem}" alt="${alt}">
      <div class="info">
        <h2>${nome}</h2>
        <p class="preco">${preco}</p>
        <div class="detalhes">${detalhes}</div>
        <a class="botao" href="https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}" target="_blank" rel="noreferrer">
          Comprar
        </a>
      </div>
    </article>
  `;
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
