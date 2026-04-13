import { defineConfig, devices } from '@playwright/test';

// Isolated Playwright setup for Claude Code MCP (playwright-test).
// Does NOT interfere with the repo's PHPUnit+Selenium browser tests in tests/AdminCabinet.
// MCP server is launched via .mcp.json with: `playwright run-test-mcp-server -c .claude/playwright`
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: process.env.MIKOPBX_BASE_URL ?? 'http://127.0.0.1',
    // Localhost requests bypass authentication in MikoPBX — no token needed for MCP checks.
    ignoreHTTPSErrors: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
