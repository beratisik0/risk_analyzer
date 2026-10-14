import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        format: 'iife',
        entryFileNames: 'content/[name].js',
        extend: true,
      },
    },
    target: 'esnext',
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
