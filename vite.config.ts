import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    port: process.env.PORT || 80,
    host: true, // IMPORTANT for Render
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-shiki': ['shiki'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['overlayscrollbars', 'overlayscrollbars-react', 'html-react-parser'],
          'vendor-emoji': ['@/generated/emojiMap', '@/generated/emojiCategories'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
