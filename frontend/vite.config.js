import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'buffer'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true
    },
    define: {
        'global': 'globalThis',
        'process.env': {},
        'process.version': JSON.stringify('v16.0.0'),
        'process.browser': true,
        'Buffer': ['buffer', 'Buffer']
    },
    resolve: {
        alias: {
            stream: 'stream-browserify',
            util: 'util',
            process: 'process/browser',
            buffer: 'buffer'
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
