import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PitchCat',
      fileName: (format) => (format === 'iife' ? 'mascot.min.js' : 'pitchcat.js'),
      formats: ['es', 'iife'],
    },
    rollupOptions: {
      output: {
        // Single bundle, no code-splitting
        inlineDynamicImports: true,
      },
    },
    // Keep it small
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: true,
  },
});
