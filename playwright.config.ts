import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 5_000,
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", headless: true },
    },
    {
      name: "firefox",
      use: { browserName: "firefox", headless: true },
    },
    {
      name: "webkit",
      use: { browserName: "webkit", headless: true },
    },
  ],
});
