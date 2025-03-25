import typescript from "@rollup/plugin-typescript";
import del from "rollup-plugin-delete";
import { dts } from "rollup-plugin-dts";

const config = [
  // Server build
  {
    input: "src/server.ts",
    output: {
      file: "dist/server.js",
      format: "es",
      exports: "named",
      sourcemap: true,
    },
    external: ["nanoevents", "uuid", "eventsource", "node-fetch"],
    plugins: [typescript()],
  },
  // Browser build
  {
    input: "src/browser.ts",
    output: {
      file: "dist/browser.js",
      format: "es",
      exports: "named",
      sourcemap: true,
    },
    external: ["nanoevents", "eventsource"],
    plugins: [typescript()],
  },
  // TypeScript declaration files for the server
  {
    input: "./dist/dts/server.d.ts",
    output: [{ file: "dist/server.d.ts", format: "es" }],
    plugins: [dts()],
  },
  // TypeScript declaration files for the browser
  {
    input: "./dist/dts/browser.d.ts",
    output: [{ file: "dist/browser.d.ts", format: "es" }],
    plugins: [dts(), del({ hook: "buildEnd", targets: "./dist/dts" })], // Cleanup inside dts build
  },
];

export default config;
