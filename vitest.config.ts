import { coverageConfigDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: ['src/physics/**', 'src/math/**', 'src/utils/**'],
      // 剔除纯类型定义、barrel 导出及 React/浏览器 I/O Hook，让覆盖率聚焦纯物理与纯算法层
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/types.ts',
        '**/index.ts',
        'src/physics/chartPoint.ts',
        'src/utils/use*.ts',
        'src/utils/animation.ts',
        'src/utils/storage.ts',
        'src/utils/lazyWithPreload.ts',
        'src/utils/moduleHelpers.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
