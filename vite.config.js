import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Only VITE_* variables reach the app by default. APP_ENV is exposed on
  // its own (not via a broader prefix, so nothing secret can slip into the
  // public bundle): from .env locally, or the build environment on GitHub.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      'import.meta.env.APP_ENV': JSON.stringify(env.APP_ENV ?? 'production'),
    },
  }
})
