# Grüninger Wear

Catálogo estático organizado para abrir localmente e publicar no GitHub Pages.

- `index.html`: entrada principal do catálogo
- `assets/logo/`: logo e favicon
- `assets/css/style.css`: estilos preservados em arquivo próprio
- `assets/js/script.js`: leitura progressiva de `data/produtos.json`
- `assets/img/produtos/`: imagens separadas por categoria
- `data/produtos.json`: base inicial de produtos
- `docs/organizacao.txt`: referência rápida para futuras imagens

Ao abrir via `file://`, o card estático mantém o catálogo funcional. Em servidor ou GitHub Pages, o JavaScript também lê `data/produtos.json`.

## Categorias de camisas

A pasta `assets/img/produtos/camisas/` foi preparada para futuras camisas sem alterar o funcionamento atual.

- `assets/img/produtos/camisas/street/`: use para camisas com proposta streetwear, visual urbano e modelagem ligada à linha street.
- `assets/img/produtos/camisas/oversized/`: use para camisas com modelagem oversized, caimento amplo e foco nessa subcategoria.

A pasta `assets/img/produtos/camisetas/` continua ativa para as camisetas já existentes. Quando quiser usar as novas subcategorias, basta apontar o campo `imagem` no `data/produtos.json` para o caminho correto dentro de `camisas/street` ou `camisas/oversized`.
