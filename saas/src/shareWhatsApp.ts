import { authorFullName } from './constants';
import type { Site } from './types';

export function reportWhatsAppText(site: Site) {
  const openings = site.rooms.reduce((n, room) => n + room.openings.length, 0);
  return [
    'Rapport de visite NEHOC',
    site.clientName,
    site.address,
    `${authorFullName(site.author)} · ${site.rooms.length} pièce(s) · ${openings} menuiserie(s)`,
  ]
    .filter((line) => line.trim())
    .join('\n');
}

export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function safeFilename(name: string) {
  const cleaned = name.replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim();
  return cleaned || 'chantier';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareReportOnWhatsApp(site: Site, source: HTMLElement) {
  const { default: html2pdf } = await import('html2pdf.js');
  const text = reportWhatsAppText(site);
  const filename = `Rapport-NEHOC-${safeFilename(site.clientName)}.pdf`;
  const blob = (await html2pdf()
    .set({
      margin: 8,
      filename,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 1.5, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(source)
    .outputPdf('blob')) as Blob;

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename, text });
    return 'shared' as const;
  }

  downloadBlob(blob, filename);
  return 'download' as const;
}
