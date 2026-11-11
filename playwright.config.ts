import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: [
    {
      command: 'pnpm --filter @junta/api dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'pnpm --filter @junta/api worker',
      url: 'http://localhost:4001',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    ...[3000, 3001, 3002].map((port, i) => ({
      command: `pnpm --filter @junta/${['web', 'admin', 'merchant'][i]} ${process.env.E2E_PRODUCTION ? 'start' : 'dev'}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    })),
  ],
});
