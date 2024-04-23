# https://qgcarver.github.io/halcyon-web/

## What is this?
A repl for making stuff in the browser with Fennel.

Most of the work I've done with this project exists in a private dev image, but
you can use the base-line image to do your own stuff.

## Building
`npm run build` builds the application to `public/bundle.js`, along with a sourcemap file for debugging.
`npm run dev` will run `npm start` and `npm run watch` in parallel.

## Dependencies (informal list)
- rollup
- wasmoon (Wasm implementation of Lua)
- codemirror
- fennel

## License

[MIT](LICENSE).
