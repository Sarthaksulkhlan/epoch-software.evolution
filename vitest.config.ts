import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/console/**", "src/**/*.d.ts"],
    },
    alias: {
      "@epoch/shared": resolve(__dirname, "src/shared"),
      "@epoch/core": resolve(__dirname, "src/core"),
      "@epoch/agents": resolve(__dirname, "src/agents"),
      "@epoch/graph": resolve(__dirname, "src/graph"),
      "@epoch/store": resolve(__dirname, "src/store"),
      "@epoch/sandbox": resolve(__dirname, "src/sandbox"),
    },
  },
  resolve: {
    alias: {
      "@epoch/shared": resolve(__dirname, "src/shared"),
      "@epoch/core": resolve(__dirname, "src/core"),
      "@epoch/agents": resolve(__dirname, "src/agents"),
      "@epoch/graph": resolve(__dirname, "src/graph"),
      "@epoch/store": resolve(__dirname, "src/store"),
      "@epoch/sandbox": resolve(__dirname, "src/sandbox"),
    },
  },
});
