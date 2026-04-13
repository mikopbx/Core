import { test } from '@playwright/test';

// Seed test for Claude Code playwright-test MCP.
// This test is invoked by generator_setup_page / planner_setup_page to provide
// a pre-warmed page for interactive MCP-driven browser actions.
// It MUST be a single passing test with a `page` that the MCP can latch onto.
test('seed', async ({ page }) => {
  // Navigate to a neutral, always-reachable page. The MCP session will take
  // over from here and navigate to the actual target URLs via browser_navigate.
  await page.goto('/admin-cabinet/session/index');
  // Do NOT assert — the MCP may be verifying against a container without this
  // route or with auth enabled. Just establish a live page object.
});
