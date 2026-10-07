import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  // 预声明需要预构建的重型依赖，避免 dev 冷启动重复扫描。
  // 仅对 dev 模式生效，prod build 不受影响。
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'katex',
      'idb',
      'zustand',
      // lucide-react 不在此列：包含大量 tree-shaking 友好的具名导出，
      // 强制预构建会将全部图标打包，反而增大体积。
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // 将重型第三方库拆分为独立 vendor chunk，提升首屏与长期缓存命中。
        // lucide-react 不单独分包，留给 Rollup 自动 tree-shake。
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-katex': ['katex'],
          'vendor-idb': ['idb', 'zustand'],
        },
      },
    },
  },
})
