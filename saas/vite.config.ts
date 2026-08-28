import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildIcsFromSearch, icsHeaders } from './api/build-ics.js';

function poseIcsDev() {
  return {
    name: 'pose-ics-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/nehoc-pose.ics') && !url.startsWith('/api/pose')) return next();
        const ics = buildIcsFromSearch(new URL(url, 'http://localhost').searchParams);
        if (!ics) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Dates manquantes');
          return;
        }
        const headers = icsHeaders();
        Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
        res.statusCode = 200;
        res.end(ics);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), poseIcsDev()],
  server: { port: 5173, host: true },
});
