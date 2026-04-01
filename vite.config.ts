import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 阿里百炼 Coding
      '/api/anthropic-coding': {
        target: 'https://coding.dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/anthropic-coding/, '/apps/anthropic')
      },
      // 阿里百炼
      '/api/anthropic': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/anthropic/, '/apps/anthropic')
      },
      // OpenAI
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/openai/, '')
      },
      // 通用代理 - 用于其他API
      '/api/llm': {
        target: 'https://placeholder.example.com',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // 从请求路径中提取实际目标
            const targetHost = req.headers['x-target-host'];
            if (targetHost) {
              proxyReq.setHeader('host', targetHost as string);
            }
          });
        }
      }
    }
  },
  clearScreen: false
});