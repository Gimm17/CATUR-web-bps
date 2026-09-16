import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { productionBuildConfig } from './src/config/productionBuild.js'

// https://vite.dev/config/
export default defineConfig({
  ...productionBuildConfig,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: './src/test/setup.js',
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
