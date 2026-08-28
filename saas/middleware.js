export const config = {
  matcher: '/nehoc-pose.ics',
};

function decodeIcsParam(value) {
  const b64 = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function middleware(request) {
  const encoded = new URL(request.url).searchParams.get('d') || '';
  if (!encoded || encoded.length > 20000) {
    return new Response('Missing calendar', { status: 400 });
  }
  let ics = '';
  try {
    ics = decodeIcsParam(encoded);
  } catch {
    return new Response('Invalid calendar', { status: 400 });
  }
  if (!ics.includes('BEGIN:VCALENDAR')) {
    return new Response('Invalid calendar', { status: 400 });
  }
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="NEHOC-pose.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
