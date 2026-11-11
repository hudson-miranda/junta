# Fotos do catálogo

Imagens dos produtos reais substituem os desenhos. Arquivos locais WebP, limitados a 1100 × 1000, servidos pela API em `/assets/products/`. Não são imagens geradas por IA. Modelos/cores nas fotos são referências de catálogo; cada oferta deve confirmar sua versão.

| Produto/arquivo | Página de origem | Imagem original |
|---|---|---|
| `playstation-5-slim.webp` | [Fonte](https://www.playstation.com/en-us/ps5/) | [Imagem](https://gmedia.playstation.com/is/image/SIEPDC/ps5-slim-edition-left-image-block-01-en-24jun24?$1600px$) |
| `iphone-17.webp` | [Fonte](https://www.apple.com/shop/buy-iphone/iphone-17) | [Imagem](https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-17-finish-select-black-202509?wid=1000&hei=1000&fmt=png-alpha) |
| `galaxy-s26.webp` | [Fonte](https://www.samsung.com/za/smartphones/galaxy-s/galaxy-s26-silver-shadow-256gb-sm-s942bzsoafa/) | [Imagem](https://images.samsung.com/is/image/samsung/p6pim/za/sm-s942bzsoafa/gallery/za-galaxy-s26-s942-585809-sm-s942bzsoafa-551806039?$1000_1000_PNG$) |
| `macbook-air.webp` | [Fonte](https://www.apple.com/macbook-air/) | [Imagem](https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/macbook-air-size-select-202601-13inch?wid=1200&hei=900&fmt=png-alpha) |
| `nintendo-switch.webp` | [Fonte](https://www.nintendo.com/us/gaming-systems/switch/oled-model/) | [Imagem](https://assets.nintendo.com/image/upload/f_png/q_auto/w_1200/ncom/en_US/switch/site-design-update/common-promo-switch-oled-model.png) |
| `tv-lg-oled.webp` | [Fonte](https://www.binglee.com.au/products/55-oledc5-4k-smart-tv-oled55c5psa) | [Imagem](https://media.binglee.com.au/cdn-cgi/image/fit%3Dscale-down%2Cf%3Dauto%2Cw%3D1079/a/4/e/3/a4e3271ccb02052f21cc6625d59fb7c58587bc44_LG_OLED55C5PSA_TV_Hero_1.jpg) |
| `samsung-oled.webp` | [Fonte](https://www.samsung.com/uk/tvs/oled-tv/s95f-55-inch-oled-4k-smart-tv-qe55s95fatxxu/) | [Imagem](https://images.samsung.com/is/image/samsung/p6pim/uk/qe55s95fatxxu/gallery/uk-oled-s95f-qe55s95fatxxu-555113674?$1164_776_PNG$) |
| `airpods.webp` | [Fonte](https://www.apple.com/shop/buy-airpods/airpods-pro-3) | [Imagem](https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-pro-3-hero-select-202509?wid=976&hei=916&fmt=png-alpha) |
| `apple-watch.webp` | [Fonte](https://www.apple.com/shop/buy-watch/apple-watch) | [Imagem](https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s12-case-unselect-gallery-1-202609?wid=1200&hei=900&fmt=png-alpha) |

Obtidas em 2026-11-10. Marcas e imagens pertencem aos respectivos titulares. Origem pública não concede licença: a autorização de uso comercial deve ser confirmada antes da operação pública. O arquivo LG foi obtido no distribuidor Bing Lee; os demais nas páginas/CDNs dos fabricantes. Não modificamos a aparência dos produtos.

Preparação: salvar originais em `.local/product-originals/<slug>` e executar `node scripts/prepare-product-images.mjs`. Para novos produtos, o admin pode informar uma URL HTTPS; sem foto ou com falha de carregamento, a interface informa “Foto em atualização”.
