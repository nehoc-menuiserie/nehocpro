import type { Site } from './types';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

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

function imageMaxBox(img: HTMLImageElement) {
  if (img.classList.contains('report-logo')) return { w: 140, h: 72 };
  if (img.classList.contains('report-main-photo')) return { w: 430, h: 320 };
  if (img.classList.contains('report-opening-photo')) return { w: 234, h: 294 };
  if (img.closest('.report-thumbs')) return { w: 68, h: 68 };
  return { w: 430, h: 320 };
}

function snapshotLiveImage(liveImg: HTMLImageElement, targetDoc: Document) {
  const naturalW = liveImg.naturalWidth;
  const naturalH = liveImg.naturalHeight;
  if (!naturalW || !naturalH) return null;

  const box = imageMaxBox(liveImg);
  const scale = Math.min(box.w / naturalW, box.h / naturalH);
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = targetDoc.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.className = liveImg.className;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(liveImg, 0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  return canvas;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function buildReportPdfFromPreview(iframe: HTMLIFrameElement, site: Site) {
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const doc = iframe.contentDocument;
  const pages = Array.from(doc?.querySelectorAll<HTMLElement>('.report-page') ?? []);
  if (!pages.length) throw new Error('Aperçu du rapport pas encore prêt.');

  const filename = `Rapport-NEHOC-${safeFilename(site.clientName)}.pdf`;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  for (let i = 0; i < pages.length; i += 1) {
    const livePage = pages[i];
    const liveImages = Array.from(livePage.querySelectorAll('img'));
    const canvas = await withTimeout(
      html2canvas(livePage, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 4000,
        onclone: (clonedDoc, cloned) => {
          const clonedImages = Array.from(cloned.querySelectorAll('img'));
          clonedImages.forEach((clonedImg, index) => {
            const liveImg = liveImages[index];
            if (!liveImg) return;
            const snapshot = snapshotLiveImage(liveImg, clonedDoc);
            if (snapshot) clonedImg.replaceWith(snapshot);
          });
        },
      }),
      12000,
      'La préparation du PDF a pris trop de temps.'
    );

    const ratio = canvas.height / canvas.width;
    const drawHeight = PAGE_WIDTH_MM * ratio;
    const image = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage();

    if (drawHeight <= PAGE_HEIGHT_MM + 0.5) {
      pdf.addImage(image, 'JPEG', 0, 0, PAGE_WIDTH_MM, drawHeight);
    } else {
      pdf.addImage(image, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
      let offset = PAGE_HEIGHT_MM;
      while (offset < drawHeight - 0.5) {
        pdf.addPage();
        pdf.addImage(image, 'JPEG', 0, -offset, PAGE_WIDTH_MM, drawHeight);
        offset += PAGE_HEIGHT_MM;
      }
    }
  }

  const blob = pdf.output('blob');
  return new File([blob], filename, { type: 'application/pdf' });
}

export async function sharePdfFile(file: File) {
  const fresh = new File([file], file.name, { type: 'application/pdf' });
  if (navigator.share) {
    try {
      await navigator.share({ files: [fresh], title: fresh.name });
      return 'shared' as const;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared' as const;
    }
  }

  downloadBlob(fresh, fresh.name);
  return 'saved' as const;
}
