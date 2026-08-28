import type { Site } from './types';

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function fold(line: string) {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 74) chunks.push((i ? ' ' : '') + line.slice(i, i + 74));
  return chunks.join('\r\n');
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function dateValue(isoDate: string) {
  return isoDate.replaceAll('-', '');
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateTimeValue(local: string) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function addMinutesValue(local: string, minutes: number) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function eventBlock({
  uid,
  summary,
  description,
  location,
  start,
  end,
  allDay,
}: {
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay?: boolean;
}) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp()}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    fold(`SUMMARY:${icsEscape(summary)}`),
    fold(`DESCRIPTION:${icsEscape(description)}`),
    fold(`LOCATION:${icsEscape(location)}`),
    'BEGIN:VALARM',
    allDay ? 'TRIGGER:PT8H' : 'TRIGGER:PT0S',
    'ACTION:DISPLAY',
    fold(`DESCRIPTION:${icsEscape(summary)}`),
    'END:VALARM',
    'END:VEVENT',
  ];
  return lines.join('\r\n');
}

function nextDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(y, (m || 1) - 1, (d || 1) + 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export function buildPlanIcs(site: Site) {
  const name = site.clientName || 'Client';
  const where = site.address || '';
  const desc = [name, where, site.clientPhone].filter(Boolean).join(' — ');
  const events: string[] = [];

  if (site.poseDate) {
    events.push(
      eventBlock({
        uid: `${site.id}-pose@nehocpro`,
        summary: `Pose NEHOC — ${name}`,
        description: desc,
        location: where,
        start: dateValue(site.poseDate),
        end: dateValue(nextDay(site.poseDate)),
        allDay: true,
      })
    );
  }
  if (site.reminder1) {
    const start = dateTimeValue(site.reminder1);
    events.push(
      eventBlock({
        uid: `${site.id}-rappel1@nehocpro`,
        summary: `Rappel 1 NEHOC — ${name}`,
        description: desc,
        location: where,
        start,
        end: addMinutesValue(site.reminder1, 30),
      })
    );
  }
  if (site.reminder2) {
    const start = dateTimeValue(site.reminder2);
    events.push(
      eventBlock({
        uid: `${site.id}-rappel2@nehocpro`,
        summary: `Rappel 2 NEHOC — ${name}`,
        description: desc,
        location: where,
        start,
        end: addMinutesValue(site.reminder2, 30),
      })
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEHOC//NEHOCPRO//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export type PlanPayload = {
  id: string;
  n: string;
  a: string;
  p: string;
  pose: string;
  r1: string;
  r2: string;
};

export function planPayload(site: Site): PlanPayload {
  return {
    id: site.id || '',
    n: site.clientName || '',
    a: site.address || '',
    p: site.clientPhone || '',
    pose: site.poseDate || '',
    r1: site.reminder1 || '',
    r2: site.reminder2 || '',
  };
}

export function planCalendarHref(site: Site) {
  const p = planPayload(site);
  const q = new URLSearchParams();
  if (p.id) q.set('id', p.id);
  if (p.n) q.set('n', p.n);
  if (p.a) q.set('a', p.a);
  if (p.p) q.set('p', p.p);
  if (p.pose) q.set('pose', p.pose);
  if (p.r1) q.set('r1', p.r1);
  if (p.r2) q.set('r2', p.r2);
  return `/nehoc-pose.ics?${q.toString()}`;
}
