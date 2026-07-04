import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  server: {
    https: true,
    host: '0.0.0.0', // expose on local network
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9080',
        changeOrigin: true
      }
    }
  },
  plugins: [ mkcert() ]
})
