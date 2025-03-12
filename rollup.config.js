import typescript from "@rollup/plugin-typescript";
import del from "rollup-plugin-delete";
import { dts } from "rollup-plugin-dts";
const config = [
  {
    input: "src/main.ts",
    output: {
      file: "dist/index.js",
      format: "es",
      exports: "named",
      sourcemap: true,
    },
    external: ["nanoevents"],
    plugins: [typescript()],
  },
  {
    input: "./dist/dts/main.d.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [dts(), del({ hook: "buildEnd", targets: "./dist/dts" })],
  },
];
export default config;
