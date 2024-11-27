import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dangerouslyIgnoreUnhandledErrors: true, // this.WebSocketClass is not a constructor
    environment: 'happy-dom',
    globals: true,
    exclude: ['node_modules'],
  },
})
