import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["**/*-test.ts", "**/*.test.ts"],
    clearMocks: true,
    setupFiles: [],
    // coverage: {
    //   provider: "istanbul",
    //   reporter: ["text", "lcov"],
    //   all: true,
    // },
    watch: false,
    testTimeout: 20000, // increase for replica set / transactions
  },
});
