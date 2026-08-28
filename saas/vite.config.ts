import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

function decodeIcsParam(value: string) {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function attachIcsApi(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((req, res, next) => {
    const raw = req.url || '';
    if (!raw.startsWith('/api/ics')) {
      next();
      return;
    }
    const encoded = new URL(raw, 'http://localhost').searchParams.get('d') || '';
    if (!encoded || encoded.length > 20000) {
      res.statusCode = 400;
      res.end('Missing calendar');
      return;
    }
    let ics = '';
    try {
      ics = decodeIcsParam(encoded);
    } catch {
      res.statusCode = 400;
      res.end('Invalid calendar');
      return;
    }
    if (!ics.includes('BEGIN:VCALENDAR')) {
      res.statusCode = 400;
      res.end('Invalid calendar');
      return;
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="NEHOC-pose.ics"');
    res.setHeader('Cache-Control', 'no-store');
    res.end(ics);
  });
}

function icsApiPlugin(): Plugin {
  return {
    name: 'ics-api',
    configureServer: attachIcsApi,
    configurePreviewServer: attachIcsApi,
  };
}

export default defineConfig({
  plugins: [react(), icsApiPlugin()],
  server: { port: 5173, host: true },
});
