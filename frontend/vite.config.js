import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true
    },
    define: {
        'global': 'globalThis',
        'process.env': {}
    },
    resolve: {
        alias: {
            stream: 'stream-browserify',
            util: 'util'
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    }
})
