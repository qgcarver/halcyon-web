# https://qgcarver.github.io/halcyon-web/

## What is this?
Think of it as a codepen clone IDE with Lua built in.

## Is this maintained?
This open-source repository will load and run development images written as JSON files.
The indended use is for development only, and said JSON objects will be used to
live-reload Javascript and Lua. Nothing here should be used in any sort of 
security sensitive context, in fact this playground is designed to be usable offline.

Another repository or branch will have a similar image loading feature for users
which will *not* reload any javascript and provide sandboxing for the Lua modules.

This design means this repo is not expected to recieve regular updates, even if
the broader project is being actively developed.

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
