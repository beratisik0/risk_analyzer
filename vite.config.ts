import { defineConfig, build } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/service-worker.js';
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
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
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'public/icons/*', dest: 'icons' },
      ],
    }),
    {
      name: 'postbuild-copy-html-and-content',
      async closeBundle() {
        const popupSrc = resolve(__dirname, 'dist/src/popup/popup.html');
        const popupDestDir = resolve(__dirname, 'dist/popup');
        const popupDest = resolve(popupDestDir, 'popup.html');
        if (fs.existsSync(popupSrc)) {
          fs.mkdirSync(popupDestDir, { recursive: true });
          fs.copyFileSync(popupSrc, popupDest);
        }

        const optionsSrc = resolve(__dirname, 'dist/src/options/options.html');
        const optionsDestDir = resolve(__dirname, 'dist/options');
        const optionsDest = resolve(optionsDestDir, 'options.html');
        if (fs.existsSync(optionsSrc)) {
          fs.mkdirSync(optionsDestDir, { recursive: true });
          fs.copyFileSync(optionsSrc, optionsDest);
        }

        // Build content-script as standalone IIFE (no ES modules)
        await build({
          configFile: false,
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
      },
    },
  ],
});

