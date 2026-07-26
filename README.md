# late-micro-games

Microfront de juegos online. Bundle ESM que el shell (`late-web-ui`) carga vía
`<script type="module">`. Publica `window.GamesEngine` y monta la UI en
`<div id="micro-games-root">` cuando aparece en el DOM.

## Build local

```bash
npm install
npm run build
# dist/entry.js + dist/style.css → rsync a /var/www/html/micro/games/vX.Y.Z/
```

## Contrato

`window.GamesEngine` expone la API de juegos. React y ReactDOM están `external` — el shell los sirve desde `/vendor/`.
