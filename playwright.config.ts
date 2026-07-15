import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 —— 视觉回归测试
 *
 * 用于物理动画页面的截图回归测试。
 * 测试流程：启动 vite dev server -> 访问动画页面 -> 截图 -> 与基准对比
 */
export default defineConfig({
  testDir: './e2e',

  /* 截图基准目录 */
  snapshotDir: './e2e/__snapshots__',

  /* 最大并行工作进程 */
  workers: process.env.CI ? 1 : undefined,

  /* 重试次数 */
  retries: process.env.CI ? 2 : 0,

  /* 报告器 */
  reporter: [['html', { open: 'never' }], ['list']],

  /* 共享配置 */
  use: {
    /* 基准 URL */
    baseURL: 'http://localhost:5173',

    /* 截图配置 */
    screenshot: 'only-on-failure',

    /* 跟踪 */
    trace: 'on-first-retry',

    /* 视口 */
    viewport: { width: 1280, height: 720 },
  },

  /* 项目配置 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 本地开发服务器 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
