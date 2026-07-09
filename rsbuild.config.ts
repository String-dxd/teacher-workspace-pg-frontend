import path from 'node:path';

import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  source: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'pg',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
  tools: {
    postcss: (_, { addPlugins }) => {
      addPlugins([tailwindcss()]);
    },
  },
  output: {
    assetPrefix: process.env.ASSET_PREFIX || 'auto',
  },
  server: {
    port: Number(process.env.PORT) || 3001,
    publicDir: {
      ignore: ['**/mockServiceWorker.js'],
    },
  },
});
