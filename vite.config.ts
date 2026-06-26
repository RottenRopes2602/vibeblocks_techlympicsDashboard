import type { Connect } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /techlympics (슬래시 없음) → /techlympics/ 자동 리다이렉트 (Vite 6 기본 동작 보완)
function trailingSlashRedirect(): { name: string; configureServer: (server: { middlewares: Connect.Server }) => void } {
  return {
    name: 'trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/techlympics') {
          res.writeHead(301, { Location: '/techlympics/' })
          res.end()
          return
        }
        next()
      })
    },
  }
}

// 로컬 포트 = 2xxx 회사 표준 (AGENTS.md) — 2180
export default defineConfig({
  // vibeblocks.co/techlympics 경로 아래에서 서빙 (vercel rewrite 프록시)
  base: '/techlympics/',
  plugins: [react(), trailingSlashRedirect()],
  server: { port: 2180 },
})
