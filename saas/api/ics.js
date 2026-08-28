function decodeIcsParam(value) {
  const b64 = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const raw = req.query?.d;
  const encoded = Array.isArray(raw) ? raw[0] : raw;
  if (!encoded || encoded.length > 20000) {
    res.status(400).send('Missing calendar');
    return;
  }
  let ics = '';
  try {
    ics = decodeIcsParam(encoded);
  } catch {
    res.status(400).send('Invalid calendar');
    return;
  }
  if (!ics.includes('BEGIN:VCALENDAR')) {
    res.status(400).send('Invalid calendar');
    return;
  }
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="NEHOC-pose.ics"');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(ics);
}
