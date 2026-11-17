import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * O LocalStack bloqueia requisições cross-origin vindas do navegador (CORS),
 * então todas as chamadas passam por um proxy em `/localstack/*`.
 * O mesmo contrato é reproduzido pelo nginx da imagem Docker.
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const endpoint = (env.LOCALSTACK_ENDPOINT || 'http://localhost:4566').replace(/\/+$/, '')
  const port = Number(env.PORT) || 8025

  const proxy: Record<string, ProxyOptions> = {
    '/localstack': {
      target: endpoint,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/localstack/, '') || '/',
      configure: (p) => {
        // O LocalStack rejeita (403) requisições com Origin fora da lista de CORS.
        p.on('proxyReq', (proxyReq) => {
          proxyReq.removeHeader('origin')
          proxyReq.removeHeader('referer')
        })
      },
    },
  }

  const runtimeConfig: Plugin = {
    name: 'runtime-config',
    configureServer: (server) => serveConfig(server.middlewares),
    configurePreviewServer: (server) => serveConfig(server.middlewares),
  }

  function serveConfig(middlewares: { use: (path: string, fn: (req: unknown, res: import('node:http').ServerResponse) => void) => void }) {
    middlewares.use('/config.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ localstackEndpoint: endpoint }))
    })
  }

  return {
    plugins: [react(), runtimeConfig],
    server: { port, proxy },
    preview: { port, proxy },
    // Ferramenta local: um único bundle (~300 KB gzip) é aceitável.
    build: { chunkSizeWarningLimit: 1500 },
  }
})
