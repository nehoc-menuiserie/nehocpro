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

function scopeReportCss(css: string) {
  return css
    .replaceAll('.report-', '[data-nehoc-pdf] .report-')
    .replaceAll('html,body{', '[data-nehoc-pdf]{')
    .replaceAll('body{', '[data-nehoc-pdf]{')
    .replaceAll('*{box-sizing', '[data-nehoc-pdf],[data-nehoc-pdf] *{box-sizing');
}

function mountReport(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const host = document.createElement('div');
  host.setAttribute('data-nehoc-pdf', '1');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;pointer-events:none;';
  const style = parsed.querySelector('style');
  if (style) {
    const scoped = document.createElement('style');
    scoped.textContent = scopeReportCss(style.textContent || '');
    host.appendChild(scoped);
  }
  const extra = document.createElement('style');
  extra.textContent =
    '[data-nehoc-pdf] .report-page{margin:0!important;box-shadow:none!important;background:#fff!important}';
  host.appendChild(extra);
  for (const child of Array.from(parsed.body.children)) {
    host.appendChild(child.cloneNode(true));
  }
  document.body.appendChild(host);
  return host;
}

export async function shareReportOnWhatsApp(site: Site, html: string) {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const text = reportWhatsAppText(site);
  const filename = `Rapport-NEHOC-${safeFilename(site.clientName)}.pdf`;
  const host = mountReport(html);

  try {
    const pages = Array.from(host.querySelectorAll<HTMLElement>('.report-page'));
    if (!pages.length) throw new Error('Rapport vide');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = 210;
    const pageHeight = 297;

    for (let i = 0; i < pages.length; i += 1) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: pages[i].scrollWidth,
      });
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      const img = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, 0, pageWidth, Math.min(imgHeight, pageHeight));

      if (imgHeight > pageHeight + 1) {
        let offsetMm = pageHeight;
        while (offsetMm < imgHeight) {
          pdf.addPage();
          pdf.addImage(img, 'JPEG', 0, -offsetMm, pageWidth, imgHeight);
          offsetMm += pageHeight;
        }
      }
    }

    const blob = pdf.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename, text });
      return 'shared' as const;
    }

    downloadBlob(blob, filename);
    return 'download' as const;
  } finally {
    host.remove();
  }
}
