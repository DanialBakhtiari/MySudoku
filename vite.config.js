import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import obfuscator from "rollup-plugin-obfuscator";

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    // {
    //   ...obfuscator({
    //     global: true,
    //     options: {
    //       compact: true,
    //       controlFlowFlattening: true,
    //       controlFlowFlatteningThreshold: 0.75,
    //       deadCodeInjection: true,
    //       deadCodeInjectionThreshold: 0.4,
    //       debugProtection: true,
    //       debugProtectionInterval: 2000,
    //       disableConsoleOutput: true,
    //       identifierNamesGenerator: "hexadecimal",
    //       log: false,
    //       renameGlobals: false,
    //       rotateStringArray: true,
    //       selfDefending: true,
    //       stringArray: true,
    //       stringArrayEncoding: ["base64"],
    //       stringArrayThreshold: 0.75,
    //       unicodeEscapeSequence: false,
    //     },
    //   }),
    //   apply: "build",
    // },
  ],
  build: {
    sourcemap: false,
  },
});
