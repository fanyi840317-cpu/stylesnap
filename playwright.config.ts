import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        launchOptions: {
          args: [
            `--load-extension=/Users/fanyi/WorkBuddy/Claw/stylesnap/dist`,
            '--disable-extensions-except=/Users/fanyi/WorkBuddy/Claw/stylesnap/dist',
          ],
        },
      },
    },
  ],
})
