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
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function addMinutesValue(local: string, minutes: number) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
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
    allDay ? 'TRIGGER:-PT15H' : 'TRIGGER:-PT15M',
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

function icsFile(site: Site) {
  const blob = new Blob([buildPlanIcs(site)], { type: 'text/calendar;charset=utf-8' });
  const safe = (site.clientName || 'chantier').replace(/[^\w\-]+/g, '_');
  return new File([blob], `NEHOC-pose-${safe}.ics`, { type: 'text/calendar' });
}

export async function addPlanToPhone(site: Site): Promise<'shared' | 'downloaded'> {
  const file = icsFile(site);
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: `Pose NEHOC — ${site.clientName || 'chantier'}`,
        text: 'Ajoutez la pose et les rappels dans le calendrier du téléphone.',
      });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
