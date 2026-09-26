import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration and e2e tests drive git and child processes against a shared
    // toolchain; running files one at a time keeps them deterministic.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/console/**', 'src/**/*.d.ts']
    }
  }
});
