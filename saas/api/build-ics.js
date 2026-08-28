function pad(n) {
  return String(n).padStart(2, '0');
}

function esc(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function stamp() {
  const d = new Date();
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function dateValue(isoDate) {
  return String(isoDate || '').replace(/-/g, '');
}

function nextDay(isoDate) {
  const [y, m, d] = String(isoDate || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

function floating(local) {
  const match = String(local || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}00`;
}

function addMinutes(local, minutes) {
  const match = String(local || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return '';
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5] + minutes, 0));
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    '00'
  );
}

function eventBlock({ uid, summary, description, location, start, end, allDay }) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp()}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    'BEGIN:VALARM',
    allDay ? 'TRIGGER:PT8H' : 'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)}`,
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

export function buildIcsFromSearch(searchParams) {
  const name = searchParams.get('n') || 'Client';
  const where = searchParams.get('a') || '';
  const phone = searchParams.get('p') || '';
  const pose = searchParams.get('pose') || '';
  const r1 = searchParams.get('r1') || '';
  const r2 = searchParams.get('r2') || '';
  const id = (searchParams.get('id') || 'nehoc').replace(/[^a-zA-Z0-9-]/g, '');
  const desc = [name, where, phone].filter(Boolean).join(' — ');
  const events = [];

  if (pose) {
    events.push(
      eventBlock({
        uid: `${id}-pose@nehocpro.fr`,
        summary: `Pose NEHOC — ${name}`,
        description: desc,
        location: where,
        start: dateValue(pose),
        end: nextDay(pose),
        allDay: true,
      })
    );
  }
  if (r1 && floating(r1)) {
    events.push(
      eventBlock({
        uid: `${id}-rappel1@nehocpro.fr`,
        summary: `Rappel 1 NEHOC — ${name}`,
        description: desc,
        location: where,
        start: floating(r1),
        end: addMinutes(r1, 30),
      })
    );
  }
  if (r2 && floating(r2)) {
    events.push(
      eventBlock({
        uid: `${id}-rappel2@nehocpro.fr`,
        summary: `Rappel 2 NEHOC — ${name}`,
        description: desc,
        location: where,
        start: floating(r2),
        end: addMinutes(r2, 30),
      })
    );
  }

  if (!events.length) return '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEHOC//NEHOCPRO//FR',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function icsHeaders() {
  return {
    'Content-Type': 'text/calendar',
    'Content-Disposition': 'inline; filename="nehoc-pose.ics"',
    'Cache-Control': 'no-store',
  };
}
