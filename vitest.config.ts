import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["website/**", "**/index.ts"],
    },
  },
});
