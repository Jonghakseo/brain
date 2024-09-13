import { defineConfig } from 'vite';
import { resolve } from 'path';
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets';
import makeManifestPlugin from './utils/plugins/make-manifest-plugin';
import { watchRebuildPlugin } from '@chrome-extension-boilerplate/hmr';
import { configDotenv } from 'dotenv';

configDotenv();

const rootDir = resolve(__dirname);
const libDir = resolve(rootDir, 'lib');

const isDev = process.env.__DEV__ === 'true';
const isProduction = !isDev;

const outDir = resolve(rootDir, '..', 'dist');
export default defineConfig({
  resolve: {
    alias: {
      '@root': rootDir,
      '@lib': libDir,
      '@assets': resolve(libDir, 'assets'),
    },
  },
  plugins: [
    libAssetsPlugin({
      outputPath: outDir,
    }),
    makeManifestPlugin({ outDir }),
    isDev && watchRebuildPlugin({ reload: true }),
  ],
  publicDir: resolve(rootDir, 'public'),
  build: {
    lib: {
      formats: ['iife'],
      entry: resolve(__dirname, 'lib/background/index.ts'),
      name: 'BackgroundScript',
      fileName: 'background',
    },
    outDir,
    sourcemap: isDev,
    minify: false,
    reportCompressedSize: isProduction,
    modulePreload: true,
    rollupOptions: {
      external: ['chrome'],
    },
  },
  define: {
    'process.env.NODE_ENV': `"production"`,
    'process.env.OPENAI_KEY': `"${process.env.OPENAI_KEY ?? ''}"`,
    'process.env.AZURE_OPENAI_KEY': `"${process.env.AZURE_OPENAI_KEY ?? ''}"`,
    'process.env.AZURE_OPENAI_ENDPOINT': `"${process.env.AZURE_OPENAI_ENDPOINT ?? ''}"`,
    'process.env.GOOGLEAI_KEY': `"${process.env.GOOGLEAI_KEY ?? ''}"`,
  },
});
