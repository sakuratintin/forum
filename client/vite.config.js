import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 用轮询并忽略编辑器的原子写入临时文件，避免 Windows 上 EBUSY 崩溃
    watch: {
      usePolling: true,
      interval: 300,
      ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/*.temp', '**/*.swp'],
    },
    // 后端接口统一走 /api，联调时转发到 Express 服务（端口 4000）
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
