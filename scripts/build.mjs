// Bundles the React app into public/app.js
import * as esbuild from "esbuild";
const watch = process.argv.includes("--watch");
const opts = {
  entryPoints: ["src/main.jsx"],
  bundle: true,
  outfile: "public/app.js",
  format: "esm",
  jsx: "automatic",
  minify: !watch,
  sourcemap: watch,
  target: ["es2020"],
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  logLevel: "info",
};
if (watch) await (await esbuild.context(opts)).watch();
else await esbuild.build(opts);
