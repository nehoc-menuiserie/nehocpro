import { buildIcsFromSearch, icsHeaders } from './build-ics.js';

export const config = { runtime: 'edge' };

export default function handler(request) {
  const url = new URL(request.url);
  const ics = buildIcsFromSearch(url.searchParams);
  if (!ics) {
    return new Response('Dates manquantes', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return new Response(ics, { status: 200, headers: icsHeaders() });
}
