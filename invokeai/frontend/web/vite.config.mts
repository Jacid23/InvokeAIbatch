/// <reference types="vitest" />
import { transformAsync } from '@babel/core';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type Plugin } from 'vite';
import eslint from 'vite-plugin-eslint';
import { loggerContextPlugin } from './vite-plugin-logger-context';

const reactCompilerPlugin = (): Plugin => ({
  name: 'react-compiler',
  async transform(code, id) {
    if (!/\.[jt]sx?$/.test(id) || id.includes('node_modules')) {
      return null;
    }

    const result = await transformAsync(code, {
      filename: id,
      presets: ['@babel/preset-typescript'],
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      sourceMaps: true,
      sourceFileName: id,
    });

    if (!result?.code) {
      return null;
    }

    return {
      code: result.code,
      map: result.map,
    };
  },
});

export default defineConfig(({ mode }) => {
  return {
    base: './',
    plugins: [
      react(),
      reactCompilerPlugin(),
      mode !== 'test' && eslint({ failOnError: mode === 'production', failOnWarning: mode === 'production' }),
      mode !== 'test' && loggerContextPlugin(),
      visualizer(),
    ],
    resolve: {
      tsconfigPaths: true,
      alias: {
        util: 'util/',
      },
    },
    build: {
      chunkSizeWarningLimit: 4000,
    },
    server: {
      proxy: {
        '/ws/socket.io': {
          target: 'ws://127.0.0.1:9090',
          ws: true,
        },
        '/openapi.json': {
          target: 'http://127.0.0.1:9090/openapi.json',
          rewrite: (path) => path.replace(/^\/openapi.json/, ''),
          changeOrigin: true,
        },
        '/api/': {
          target: 'http://127.0.0.1:9090/api/',
          rewrite: (path) => path.replace(/^\/api/, ''),
          changeOrigin: true,
        },
      },
      host: '0.0.0.0',
    },
    test: {
      reporters: [['default', { summary: false }]],
      typecheck: {
        enabled: true,
        ignoreSourceErrors: true,
      },
      coverage: {
        provider: 'v8',
        all: false,
        reporter: ['html'],
      },
    },
  };
});
