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
        'process.env': {},
        'process.version': JSON.stringify(''),
        'process.browser': true
    },
    resolve: {
        alias: {
            stream: 'stream-browserify',
            util: 'util',
            process: 'process/browser'
        }
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    },
    build: {
        rollupOptions: {
            plugins: []
        },
        commonjsOptions: {
            transformMixedEsModules: true
        }
    }
})
