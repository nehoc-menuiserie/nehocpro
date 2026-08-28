import { lookupColorHex } from './catalog';
import { authorFullName, isUndefinedColor, WOOD_GRADIENTS } from './constants';
import { dateLocale, translate, translateCatalog, type Locale } from './i18n';
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

function photo(src: string, cls: string, empty: string) {
  if (src) return `<div class="${cls}-wrap"><img class="${cls}" src="${src}" alt="Photo"></div>`;
  const ph = cls.includes('opening') ? 'report-opening-placeholder' : 'report-photo-placeholder';
  return `<div class="${ph}">${empty}</div>`;
}

function logoImg(src: string) {
  return `<img src="${src}" class="report-logo" width="140" height="72" alt="NEHOC">`;
}

export async function buildReportHtml(site: Site, locale: Locale = 'fr'): Promise<string> {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const label = (value: string) => translateCatalog(locale, value);
  const emptyPhoto = t('pdf.noPhoto');
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

  const date = new Date().toLocaleDateString(dateLocale(locale));
  const reportNo = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(Date.now()).slice(-4)}`;
  const total = rooms.reduce((n, r) => n + r.openings.length, 0);
  const author = dash(authorFullName(site.author));
  const first = general[0] || '';

  const cover = `<section class="report-page report-cover">
    <header class="report-header">${logoImg(logo)}<div class="report-brand"><strong>${author}</strong>${t('pdf.projectLead')}<br>${t('pdf.brandLine')}<br>www.nehoc.fr</div><div class="report-id"><strong>${t('pdf.report')}</strong>N° ${reportNo}<br>${date}</div></header>
    <div class="report-title"><h1>${t('pdf.visitTitle')}</h1><p>${t('pdf.visitSub')}</p></div>
    <div class="report-meta"><div><span class="report-label">${t('pdf.client')}</span><span class="report-value">${dash(site.clientName)}</span></div><div><span class="report-label">${t('pdf.address')}</span><span class="report-value">${dash(site.address)}</span></div><div><span class="report-label">${t('pdf.siteType')}</span><span class="report-value">${dash(label(site.siteType))}</span></div><div><span class="report-label">${t('pdf.works')}</span><span class="report-value">${dash(label(site.workType))}</span></div></div>
    <div class="report-overview"><div>${photo(first, 'report-main-photo', emptyPhoto)}</div><div class="report-summary"><h2 class="report-section-title">${t('pdf.summary')}</h2><div class="report-summary-row"><b>${t('pdf.author')}</b>${author}</div><div class="report-summary-row"><b>${t('pdf.contact')}</b>${dash(site.clientPhone)}<br>${dash(site.clientEmail)}</div><div class="report-summary-row"><b>${t('pdf.roomsCounted')}</b>${rooms.length}</div><div class="report-summary-row"><b>${t('pdf.openingsCounted')}</b>${total}</div></div></div>
    <div class="report-section"><h2 class="report-section-title">${t('pdf.generalNotes')}</h2><div class="report-notes">${dash(site.generalNotes)}</div></div>
    <div class="report-signatures"><div class="report-signature"><strong>${t('pdf.clientSign')}</strong>${t('pdf.signDate')}</div><div class="report-signature"><strong>${author}</strong>${t('pdf.nehocLead')}</div></div>
    <footer class="report-footer"><span>${t('pdf.footerConfidential')}</span><span>www.nehoc.fr</span></footer>
  </section>`;

  const roomsHtml = rooms
    .map((room, ri) => {
      const openings = room.openings;
      if (!openings.length && !room.notes) return '';
      const items = openings.length
        ? openings
            .map((o, oi) => {
              const dim = o.width || o.height ? `${dash(o.width)} × ${dash(o.height)} mm` : '—';
              const thumbs =
                o.photos.length > 1
                  ? `<div class="report-thumbs">${o.photos
                      .slice(1, 8)
                      .map((p) => `<img src="${p}" alt="Photo">`)
                      .join('')}</div>`
                  : '';
              return `<article class="report-opening"><div class="report-opening-media">${photo(o.photos[0] || '', 'report-opening-photo', emptyPhoto)}${thumbs}</div><div><div class="report-opening-title"><h3>${dash(label(o.type))} ${o.ref ? `— ${esc(o.ref)}` : ''}</h3><span class="report-badge">${t('pdf.openingN', { n: oi + 1, total: openings.length })}</span></div><div class="report-specs"><div class="report-spec"><b>${t('pdf.dims')}</b><span>${dim}</span></div><div class="report-spec"><b>${t('pdf.qty')}</b><span>${dash(o.quantity)}</span></div><div class="report-spec"><b>${t('pdf.pose')}</b><span>${dash(label(o.pose))}</span></div><div class="report-spec report-spec-color"><b>${t('pdf.color')}</b>${colorSwatch(o.colorRal)}</div><div class="report-spec"><b>${t('pdf.room')}</b><span>${dash(room.name)}</span></div></div><p class="report-opening-notes"><strong>${t('pdf.obs')}</strong> ${dash(o.notes)}</p></div></article>`;
            })
            .join('')
        : `<div class="report-notes" style="margin-top:5mm">${t('pdf.noOpening')}</div>`;
      const roomMeta = openings.length > 1 ? t('pdf.roomMetaMany', { n: openings.length }) : t('pdf.roomMeta', { n: openings.length });
      return `<div class="report-room"><div class="report-room-head"><h2>${dash(room.name || t('pdf.roomFallback', { n: ri + 1 }))}</h2><span>${roomMeta}${room.notes ? ` · ${esc(room.notes)}` : ''}</span></div>${items}</div>`;
    })
    .join('');

  const flow = roomsHtml
    ? `<section class="report-page report-flow"><header class="report-header">${logoImg(logo)}<div class="report-brand"><strong>${author}</strong>${t('pdf.projectLead')}<br>www.nehoc.fr</div><div class="report-id"><strong>${t('pdf.survey')}</strong>${dash(site.clientName)}<br>${date}</div></header>${roomsHtml}<footer class="report-footer"><span>${t('pdf.footerVisit')}</span><span>www.nehoc.fr</span></footer></section>`
    : '';

  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${t('pdf.docTitle', { name: esc(site.clientName) })}</title><style>
    *{box-sizing:border-box} html,body{margin:0;padding:0;height:auto}
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#181818;background:#fff}
    .report-page{width:210mm;padding:11mm 13mm 9mm;display:flex;flex-direction:column}
    .report-cover{break-after:page;page-break-after:always}
    .report-flow{break-after:auto;page-break-after:auto}
    .report-header{display:table;width:100%;padding-bottom:5mm;border-bottom:1px solid #b9b9b9}
    .report-header>*{display:table-cell;vertical-align:middle}
    .report-logo{width:37mm;height:19mm;max-width:37mm;max-height:19mm;object-fit:contain;object-position:left center;display:block}
    .report-brand{font-size:8.5pt;line-height:1.45;color:#555;padding:0 8mm}.report-brand strong{display:block;color:#111;font-size:11pt}
    .report-id{text-align:right;font-size:8.5pt;color:#555;white-space:nowrap;width:1%}.report-id strong{display:block;color:#111;font-size:15pt;letter-spacing:.08em}
    .report-title{margin:7mm 0 4mm}.report-title h1{font-size:20pt;letter-spacing:.08em;margin:0}.report-title p{margin:1.5mm 0 0;font-size:9pt;color:#666}
    .report-meta{display:table;width:100%;table-layout:fixed;border-collapse:collapse;border:1px solid #d7d7d7;border-radius:3mm;overflow:hidden;margin-bottom:5mm}
    .report-meta>div{display:table-cell;vertical-align:top;padding:3mm;border-right:1px solid #e2e2e2}
    .report-meta>div:nth-child(1){width:22%}.report-meta>div:nth-child(2){width:38%}
    .report-meta>div:nth-child(3),.report-meta>div:nth-child(4){width:20%}.report-meta>div:last-child{border-right:0}
    .report-label{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:6.8pt;color:#777;margin-bottom:1.2mm}
    .report-value{display:block;font-size:9pt;font-weight:650;word-break:break-word}
    .report-section-title{font-size:9pt;text-transform:uppercase;letter-spacing:.11em;margin:0 0 2.5mm;padding-left:2.5mm;border-left:3px solid #181818}
    .report-overview{display:table;width:100%;border-collapse:separate}
    .report-overview>div{display:table-cell;vertical-align:top}
    .report-overview>div:first-child{width:62%;padding-right:5mm}
    .report-overview>div:last-child{width:38%}
    .report-main-photo-wrap{width:100%;line-height:0}
    .report-main-photo{max-width:100%;width:auto;height:auto;max-height:85mm;object-fit:contain;object-position:center;border-radius:3mm;border:1px solid #d3d3d3;background:#f4f4f4;display:block}
    .report-photo-placeholder{width:100%;height:55mm;border-radius:3mm;border:1px solid #d3d3d3;background:#f4f4f4}
    .report-photo-placeholder,.report-opening-placeholder{display:flex;align-items:center;justify-content:center;color:#999;font-size:9pt}
    .report-opening-placeholder{width:58mm;height:40mm;border:1px solid #d7d7d7;border-radius:2mm;background:#f5f5f5}
    .report-summary{border:1px solid #ddd;border-radius:3mm;padding:4mm}
    .report-summary-row{padding:2.1mm 0;border-bottom:1px solid #ececec;font-size:8.5pt}.report-summary-row:last-child{border-bottom:0}
    .report-summary-row b{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.07em;color:#777;margin-bottom:.8mm}
    .report-notes{font-size:8.5pt;line-height:1.45;border:1px solid #ddd;border-radius:3mm;padding:4mm;min-height:18mm;white-space:pre-wrap}
    .report-room{margin-top:8mm}.report-room:first-of-type{margin-top:5mm}
    .report-room-head{display:table;width:100%;padding-bottom:2mm;border-bottom:1px solid #aaa}
    .report-room-head h2{display:table-cell;font-size:13pt;margin:0;vertical-align:bottom}.report-room-head span{display:table-cell;font-size:8pt;color:#666;text-align:right;vertical-align:bottom}
    .report-opening{display:table;width:100%;padding:4mm 0;border-bottom:1px solid #e5e5e5;break-inside:avoid;page-break-inside:avoid}
    .report-opening>div{display:table-cell;vertical-align:top}
    .report-opening-media{width:62mm;padding-right:5mm}
    .report-opening-photo-wrap{width:100%;line-height:0}
    .report-opening-photo{max-width:100%;width:auto;height:auto;max-height:78mm;object-fit:contain;object-position:center;border:1px solid #d7d7d7;border-radius:2mm;background:#f5f5f5;display:block}
    .report-opening-title{display:table;width:100%;margin-bottom:2mm}
    .report-opening-title h3{display:table-cell;margin:0;font-size:11pt;vertical-align:top}.report-badge{display:table-cell;font-size:7pt;border:1px solid #aaa;border-radius:99px;padding:1mm 2.5mm;white-space:nowrap;text-align:right;width:1%;vertical-align:top}
    .report-specs{display:flex;flex-wrap:wrap;gap:2mm}
    .report-spec{flex:1 1 22%;background:#f4f4f4;border-radius:1.5mm;padding:2.2mm}.report-spec b{display:block;font-size:6.5pt;text-transform:uppercase;color:#777;margin-bottom:.8mm}
    .report-spec span{font-size:8.2pt;font-weight:650}.report-spec-color{flex:2 1 46%}
    .report-color-value{display:flex;align-items:center;gap:2mm;font-size:8.2pt;font-weight:650}
    .report-color-swatch{width:7mm;height:7mm;border:1px solid #777;border-radius:1.2mm;display:inline-block;flex-shrink:0}
    .report-color-swatch.is-undefined{background:repeating-linear-gradient(135deg,#fff 0 6px,#e7e7e7 6px 12px)!important}
    .report-opening-notes{font-size:8pt;line-height:1.4;margin:2.5mm 0 0;color:#444}
    .report-thumbs{display:flex;flex-wrap:wrap;gap:2mm;margin-top:2.5mm}
    .report-thumbs img{width:auto;height:auto;max-width:18mm;max-height:18mm;object-fit:contain;object-position:center;border-radius:1mm;border:1px solid #ddd;background:#f5f5f5}
    .report-signatures{padding-top:8mm;display:table;width:100%}
    .report-signature{display:table-cell;width:50%;border-top:1px solid #999;padding-top:2mm;padding-right:12mm;font-size:7.5pt;color:#666;min-height:18mm}
    .report-signature:last-child{padding-right:0;padding-left:12mm}
    .report-signature strong{display:block;color:#222;font-size:8.5pt}
    .report-footer{margin-top:6mm;border-top:1px solid #ddd;padding-top:2mm;display:table;width:100%;font-size:7pt;color:#777}
    .report-footer>span{display:table-cell}.report-footer>span:last-child{text-align:right}
    @page{size:A4;margin:0}
    @media screen {
      body{background:#ececec}
      .report-page{box-shadow:0 8px 32px rgba(0,0,0,.12);margin:12px auto;background:#fff}
      .report-cover{min-height:297mm}
      .report-cover .report-signatures{margin-top:auto}
    }
    @media print {
      html,body{background:#fff;height:auto}
      .report-page{min-height:0;height:auto;margin:0;box-shadow:none;background:#fff}
      .report-signatures{margin-top:8mm}
    }
  </style></head><body>${cover}${flow}</body></html>`;
}
