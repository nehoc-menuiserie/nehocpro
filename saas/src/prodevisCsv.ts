import { authorFullName } from './constants';
import type { Opening, Room, Site } from './types';

const HEADERS = [
  'N° ligne',
  'Code',
  'Désignation',
  'Quantité',
  'Unité',
  'Prix unitaire HT',
  'Largeur (mm)',
  'Hauteur (mm)',
  'Type',
  'Type de pose',
  'Couleur',
  'Pièce',
  'Observations',
  'Client',
  'Téléphone',
  'Email',
  'Adresse',
  'Type de bien',
  'Nature des travaux',
  'Date de pose',
  'Notes chantier',
  'Conducteur',
  'Réf. NEHOC',
] as const;

function cell(value: string | number) {
  const raw = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (/[;"\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function frDate(iso: string) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function safeFilename(name: string) {
  const cleaned = name.replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim();
  return cleaned || 'chantier';
}

function designation(room: Room, opening: Opening) {
  const size = opening.width && opening.height ? `${opening.width} x ${opening.height} mm` : '';
  return [
    opening.type,
    opening.ref ? `Rep. ${opening.ref}` : '',
    size,
    opening.pose && opening.pose !== 'À définir' ? opening.pose : '',
    opening.colorRal,
    room.name,
  ]
    .filter(Boolean)
    .join(' — ');
}

function clientRow(site: Site) {
  return {
    client: site.clientName || `${site.clientFirstName} ${site.clientLastName}`.trim(),
    phone: site.clientPhone || '',
    email: site.clientEmail || '',
    address: site.address || '',
    siteType: site.siteType || '',
    workType: site.workType || '',
    poseDate: frDate(site.poseDate),
    notes: site.generalNotes || '',
    author: authorFullName(site.author) || site.author || '',
    ref: site.id || '',
  };
}

function productLine(site: Site, room: Room, opening: Opening, index: number) {
  const client = clientRow(site);
  const notes = [opening.notes, room.notes].filter(Boolean).join(' | ');
  return [
    String(index),
    opening.ref || '',
    designation(room, opening),
    opening.quantity || '1',
    'U',
    '',
    opening.width || '',
    opening.height || '',
    opening.type || '',
    opening.pose || '',
    opening.colorRal || '',
    room.name || '',
    notes,
    client.client,
    client.phone,
    client.email,
    client.address,
    client.siteType,
    client.workType,
    client.poseDate,
    client.notes,
    client.author,
    client.ref,
  ];
}

export function buildProdevisCsv(site: Site) {
  const lines = [HEADERS.map(cell).join(';')];
  let index = 0;
  for (const room of site.rooms) {
    for (const opening of room.openings) {
      index += 1;
      lines.push(productLine(site, room, opening, index).map(cell).join(';'));
    }
  }
  if (index === 0) {
    const client = clientRow(site);
    lines.push(
      [
        '1',
        '',
        'Aucune menuiserie relevée',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        client.client,
        client.phone,
        client.email,
        client.address,
        client.siteType,
        client.workType,
        client.poseDate,
        client.notes,
        client.author,
        client.ref,
      ]
        .map(cell)
        .join(';')
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function downloadProdevisCsv(site: Site) {
  const blob = new Blob([buildProdevisCsv(site)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NEHOC-ProDevis-${safeFilename(site.clientName)}.csv`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
