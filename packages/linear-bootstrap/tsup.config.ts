import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/cli.ts", "src/http-cli.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: ["src/http.ts"],
    format: ["esm"],
    dts: true,
    clean: false,
    sourcemap: true,
  },
]);
