import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test.playwright' }); // create this with dummy values

export default defineConfig({
  testDir: './tests',
  testMatch: ['routes/**/*.ts', 'e2e/**/*.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  webServer: {
    command: process.env.CI ? 'next start -p 3000' : 'next dev -p 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});
