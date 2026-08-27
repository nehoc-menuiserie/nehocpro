import { lookupColorHex } from './catalog';
import { authorFullName, isUndefinedColor, WOOD_GRADIENTS } from './constants';
import { resolvePhotoUri } from './lib/sync';
import { isCloudPhoto } from './lib/supabase';
import type { Site } from './types';

let cachedLogo = '';

export async function loadLogoDataUrl() {
  if (cachedLogo) return cachedLogo;
  const res = await fetch('/logo-nehoc.jpeg');
  const blob = await res.blob();
  cachedLogo = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
  return cachedLogo;
}

async function toDataUrl(uri: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:')) return uri;
  const path = isCloudPhoto(uri) ? await resolvePhotoUri(uri) : uri;
  if (!path.startsWith('http') && !path.startsWith('blob:')) return path;
  try {
    const res = await fetch(path);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  } catch {
    return path;
  }
}

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] || c
  );
}

function dash(v: unknown) {
  const s = esc(v);
  return s || '—';
}

function colorCss(value: string) {
  if (WOOD_GRADIENTS[value]) {
    const [a, b, c] = WOOD_GRADIENTS[value];
    return `linear-gradient(135deg,${a},${b},${c})`;
  }
  return lookupColorHex(value) || '#fff';
}

function colorSwatch(value: string) {
  const undef = isUndefinedColor(value);
  return `<span class="report-color-value"><i class="report-color-swatch${undef ? ' is-undefined' : ''}" style="background:${colorCss(value)}"></i><span>${dash(value)}</span></span>`;
}

function photo(src: string, cls: string) {
  if (src) return `<img class="${cls}" src="${src}" alt="Photo">`;
  const ph = cls.includes('opening') ? 'report-opening-placeholder' : 'report-photo-placeholder';
  return `<div class="${ph}">Aucune photo</div>`;
}

export async function buildReportHtml(site: Site): Promise<string> {
  const logo = await loadLogoDataUrl();
  const general = await Promise.all(site.generalPhotos.map(toDataUrl));
  const rooms = await Promise.all(
    site.rooms.map(async (room) => ({
      ...room,
      openings: await Promise.all(
        room.openings.map(async (op) => ({
          ...op,
          photos: await Promise.all(op.photos.map(toDataUrl)),
        }))
      ),
    }))
  );

  const date = new Date().toLocaleDateString('fr-FR');
  const reportNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-4)}`;
  const total = rooms.reduce((n, r) => n + r.openings.length, 0);
  const author = dash(authorFullName(site.author));
  const first = general[0] || '';

  const pages: string[] = [];
  pages.push(`<section class="report-page">
    <header class="report-header"><img src="${logo}" class="report-logo" alt="NEHOC"><div class="report-brand"><strong>${author}</strong>Chef de projet<br>Menuiseries aluminium &amp; PVC<br>www.nehoc.fr</div><div class="report-id"><strong>RAPPORT</strong>N° ${reportNo}<br>${date}</div></header>
    <div class="report-title"><h1>VISITE DE CHANTIER</h1><p>Relevé technique préalable à l'établissement du devis</p></div>
    <div class="report-meta"><div><span class="report-label">Client</span><span class="report-value">${dash(site.clientName)}</span></div><div><span class="report-label">Adresse du chantier</span><span class="report-value">${dash(site.address)}</span></div><div><span class="report-label">Type de bien</span><span class="report-value">${dash(site.siteType)}</span></div><div><span class="report-label">Travaux</span><span class="report-value">${dash(site.workType)}</span></div></div>
    <div class="report-overview"><div>${photo(first, 'report-main-photo')}</div><div class="report-summary"><h2 class="report-section-title">Synthèse</h2><div class="report-summary-row"><b>Responsable</b>${author}</div><div class="report-summary-row"><b>Contact client</b>${dash(site.clientPhone)}<br>${dash(site.clientEmail)}</div><div class="report-summary-row"><b>Pièces relevées</b>${rooms.length}</div><div class="report-summary-row"><b>Menuiseries relevées</b>${total}</div></div></div>
    <div class="report-section"><h2 class="report-section-title">Observations générales</h2><div class="report-notes">${dash(site.generalNotes)}</div></div>
    <div class="report-signatures"><div class="report-signature"><strong>Validation client</strong>Date et signature</div><div class="report-signature"><strong>${author}</strong>Chef de projet NEHOC</div></div>
    <footer class="report-footer"><span>NEHOC — Rapport de visite confidentiel</span><span>www.nehoc.fr</span></footer>
  </section>`);

  rooms.forEach((room, ri) => {
    const openings = room.openings;
    const chunks: typeof openings[] = [];
    for (let i = 0; i < openings.length; i += 4) chunks.push(openings.slice(i, i + 4));
    if (!chunks.length) chunks.push([]);
    chunks.forEach((chunk, ci) => {
      const items = chunk
        .map((o, oi) => {
          const dim = o.width || o.height ? `${dash(o.width)} × ${dash(o.height)} mm` : '—';
          const thumbs =
            o.photos.length > 1
              ? `<div class="report-thumbs">${o.photos
                  .slice(1, 5)
                  .map((p) => `<img src="${p}" alt="Photo complémentaire">`)
                  .join('')}</div>`
              : '';
          return `<article class="report-opening"><div>${photo(o.photos[0] || '', 'report-opening-photo')}${thumbs}</div><div><div class="report-opening-title"><h3>${dash(o.type)} ${o.ref ? `— ${esc(o.ref)}` : ''}</h3><span class="report-badge">Menuiserie ${ci * 4 + oi + 1}/${openings.length}</span></div><div class="report-specs"><div class="report-spec"><b>Dimensions</b><span>${dim}</span></div><div class="report-spec"><b>Quantité</b><span>${dash(o.quantity)}</span></div><div class="report-spec"><b>Type de pose</b><span>${dash(o.pose)}</span></div><div class="report-spec report-spec-color"><b>Couleur</b>${colorSwatch(o.colorRal)}</div><div class="report-spec"><b>Pièce</b><span>${dash(room.name)}</span></div></div><p class="report-opening-notes"><strong>Observations :</strong> ${dash(o.notes)}</p></div></article>`;
        })
        .join('');
      pages.push(`<section class="report-page"><header class="report-header"><img src="${logo}" class="report-logo" alt="NEHOC"><div class="report-brand"><strong>${author}</strong>Chef de projet<br>www.nehoc.fr</div><div class="report-id"><strong>RELEVÉ</strong>${dash(site.clientName)}<br>${date}</div></header><div class="report-room"><div class="report-room-head"><h2>${dash(room.name || `Pièce ${ri + 1}`)}</h2><span>${ci + 1}/${chunks.length}${room.notes ? ` · ${esc(room.notes)}` : ''}</span></div>${items || '<div class="report-notes" style="margin-top:5mm">Aucune menuiserie renseignée.</div>'}</div><footer class="report-footer"><span>NEHOC — Rapport de visite</span><span>${ri + 1}.${ci + 1}</span></footer></section>`);
    });
  });

  return `<!doctype html><html><head><meta charset="utf-8"><title>Rapport NEHOC — ${esc(site.clientName)}</title><style>
    *{box-sizing:border-box} body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#181818;background:#fff}
    .report-page{width:210mm;min-height:297mm;padding:12mm 13mm 10mm;position:relative;display:flex;flex-direction:column;page-break-after:always;margin:0 auto}
    .report-page:last-child{page-break-after:auto}
    .report-header{display:grid;grid-template-columns:42mm 1fr auto;align-items:center;gap:8mm;padding-bottom:5mm;border-bottom:1px solid #b9b9b9}
    .report-logo{width:37mm;height:19mm;object-fit:contain;object-position:left center}
    .report-brand{font-size:8.5pt;line-height:1.45;color:#555}.report-brand strong{display:block;color:#111;font-size:11pt}
    .report-id{text-align:right;font-size:8.5pt;color:#555}.report-id strong{display:block;color:#111;font-size:15pt;letter-spacing:.08em}
    .report-title{margin:7mm 0 4mm}.report-title h1{font-size:20pt;letter-spacing:.08em;margin:0}.report-title p{margin:1.5mm 0 0;font-size:9pt;color:#666}
    .report-meta{display:grid;grid-template-columns:1.1fr 1.6fr 1fr 1fr;border:1px solid #d7d7d7;border-radius:3mm;overflow:hidden;margin-bottom:5mm}
    .report-meta>div{padding:3mm;border-right:1px solid #e2e2e2}.report-meta>div:last-child{border-right:0}
    .report-label{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:6.8pt;color:#777;margin-bottom:1.2mm}
    .report-value{font-size:9pt;font-weight:650;word-break:break-word}
    .report-section-title{font-size:9pt;text-transform:uppercase;letter-spacing:.11em;margin:0 0 2.5mm;padding-left:2.5mm;border-left:3px solid #181818}
    .report-overview{display:grid;grid-template-columns:1.25fr .75fr;gap:5mm}
    .report-main-photo,.report-photo-placeholder{width:100%;height:82mm;border-radius:3mm;object-fit:cover;border:1px solid #d3d3d3;background:#f4f4f4}
    .report-photo-placeholder,.report-opening-placeholder{display:flex;align-items:center;justify-content:center;color:#999;font-size:9pt}
    .report-summary{border:1px solid #ddd;border-radius:3mm;padding:4mm;min-height:82mm}
    .report-summary-row{padding:2.1mm 0;border-bottom:1px solid #ececec;font-size:8.5pt}.report-summary-row:last-child{border-bottom:0}
    .report-summary-row b{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.07em;color:#777;margin-bottom:.8mm}
    .report-notes{font-size:8.5pt;line-height:1.45;border:1px solid #ddd;border-radius:3mm;padding:4mm;min-height:24mm;white-space:pre-wrap}
    .report-room{margin-top:5mm}.report-room-head{display:flex;justify-content:space-between;align-items:end;padding-bottom:2mm;border-bottom:1px solid #aaa}
    .report-room-head h2{font-size:13pt;margin:0}.report-room-head span{font-size:8pt;color:#666}
    .report-opening{display:grid;grid-template-columns:58mm 1fr;gap:5mm;padding:4mm 0;border-bottom:1px solid #e5e5e5}
    .report-opening-photo,.report-opening-placeholder{width:58mm;height:43mm;object-fit:cover;border:1px solid #d7d7d7;border-radius:2mm;background:#f5f5f5}
    .report-opening-title{display:flex;justify-content:space-between;gap:5mm;align-items:start;margin-bottom:2mm}
    .report-opening-title h3{margin:0;font-size:11pt}.report-badge{font-size:7pt;border:1px solid #aaa;border-radius:99px;padding:1mm 2.5mm}
    .report-specs{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}
    .report-spec{background:#f4f4f4;border-radius:1.5mm;padding:2.2mm}.report-spec b{display:block;font-size:6.5pt;text-transform:uppercase;color:#777;margin-bottom:.8mm}
    .report-spec span{font-size:8.2pt;font-weight:650}.report-spec-color{grid-column:span 2}
    .report-color-value{display:flex;align-items:center;gap:2mm;font-size:8.2pt;font-weight:650}
    .report-color-swatch{width:7mm;height:7mm;border:1px solid #777;border-radius:1.2mm;display:inline-block}
    .report-color-swatch.is-undefined{background:repeating-linear-gradient(135deg,#fff 0 6px,#e7e7e7 6px 12px)!important}
    .report-opening-notes{font-size:8pt;line-height:1.4;margin:2.5mm 0 0;color:#444}
    .report-thumbs{display:flex;gap:2mm;margin-top:2.5mm}.report-thumbs img{width:18mm;height:13mm;object-fit:cover;border-radius:1mm;border:1px solid #ddd}
    .report-signatures{margin-top:auto;padding-top:7mm;display:grid;grid-template-columns:1fr 1fr;gap:12mm}
    .report-signature{border-top:1px solid #999;padding-top:2mm;font-size:7.5pt;color:#666;min-height:20mm}
    .report-signature strong{display:block;color:#222;font-size:8.5pt}
    .report-footer{margin-top:8mm;border-top:1px solid #ddd;padding-top:2mm;display:flex;justify-content:space-between;font-size:7pt;color:#777}
    @page{size:A4;margin:0}
    @media screen { body{background:#ececec} .report-page{box-shadow:0 8px 32px rgba(0,0,0,.12);margin:12px auto;background:#fff} }
  </style></head><body>${pages.join('')}</body></html>`;
}

export function printReport(html: string) {
  const w = window.open('', '_blank');
  if (!w) {
    throw new Error('Autorisez les fenêtres pop-up pour imprimer le PDF.');
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
