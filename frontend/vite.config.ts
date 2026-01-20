import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable source maps for debugging (can disable in prod for smaller builds)
    sourcemap: false,
    // Warn if any chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
    // Use esbuild for minification (faster than terser)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          // React core - rarely changes, cache long-term
          'vendor-react': ['react', 'react-dom'],
          // Routing - separate chunk
          'vendor-router': ['react-router-dom'],
          // Data fetching - separate chunk
          'vendor-query': ['@tanstack/react-query'],
          // Shopify Polaris UI - large library, separate chunk
          'vendor-polaris': ['@shopify/polaris'],
          // Shopify App Bridge - separate for caching
          'vendor-appbridge': ['@shopify/app-bridge-react'],
          // i18n - separate chunk (loaded async when needed)
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Error tracking - low priority, can load late
          'vendor-sentry': ['@sentry/react'],
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
