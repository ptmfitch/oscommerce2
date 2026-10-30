import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config';

export default defineConfig({
  testDir: './specs',
  // Specs share one store database (stock levels, order numbers), so run serially.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: config.baseUrl,
    viewport: { width: 1280, height: 900 },
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
});
