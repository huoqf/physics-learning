import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
    build: {
        rollupOptions: {
            output: {
                // 将重型第三方库拆分为独立 vendor chunk，提升首屏与长期缓存命中
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-katex': ['katex'],
                },
            },
        },
    },
});
