/**
 * salonSettings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * THE single source of truth for salon info used in:
 *   • Printed receipts  (admin, receptionist, payments, invoices)
 *   • WhatsApp messages (all panels)
 *   • Receipt modals / previews
 *
 * Usage:
 *   import { loadSalonSettings, getSalonSettings, printReceipt,
 *            buildWAReceipt, buildWAMessage, subscribeSalonSettings } from '@/utils/salonSettings';
 *
 *   // In your component's useEffect:
 *   useEffect(() => {
 *     loadSalonSettings();
 *     const unsub = subscribeSalonSettings(() => forceUpdate());
 *     return unsub;
 *   }, []);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api from '@/services/api';

/* ── Internal cache ──────────────────────────────────────────────── */
let _cache = null;
const _listeners = new Set();
const CHANNEL = 'glamour_settings_sync';

let _bc = null;
try {
  _bc = new BroadcastChannel(CHANNEL);
  _bc.onmessage = () => loadSalonSettings();
} catch (_) {}

/* ── Default fallback (used before first load) ───────────────────── */
const DEFAULTS = {
  salonName:      'Glamour Salon',
  tagline:        'Premium Salon & Spa',
  phone:          '',
  phoneNumbers:   [],          // [{ number:'9876543210', label:'Main' }, ...]
  email:          '',
  website:        '',
  upiId:          '',
  gstNumber:      '',
  taxRate:        18,
  address: {
    street: '',
    city:   '',
    state:  '',
    pincode:'',
  },
  receiptHeader:  '',
  receiptFooter:  'Thank you for visiting! 💛',
  showGSTOnReceipt: true,
  msgBookingConfirm:  '',
  msgBookingReminder: '',
  msgPaymentReceipt:  '',
  msgCancellation:    '',
};

/* ── Load from API ───────────────────────────────────────────────── */
export async function loadSalonSettings() {
  try {
    const { data } = await api.get('/settings');
    _cache = data.settings;
    _listeners.forEach(fn => fn(_cache));
  } catch (_) {}
}

/* ── Synchronous getter (returns cached or defaults) ─────────────── */
export function getSalonSettings() {
  return _cache || DEFAULTS;
}

/* ── Subscribe to changes ────────────────────────────────────────── */
export function subscribeSalonSettings(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════════ */

const fmt    = n => Number(n || 0).toLocaleString('en-IN');
const rs     = n => `₹${fmt(n)}`;
const toDate = d => { try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }); } catch { return '—'; } };
const toDateShort = d => { try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); } catch { return '—'; } };

/** Returns all phone numbers as a formatted string */
export function getSalonPhones(s) {
  const cfg   = s || getSalonSettings();
  const extra = (cfg.phoneNumbers || []).filter(p => p?.number);
  const main  = cfg.phone ? [{ number: cfg.phone, label: 'Main' }] : [];
  const all   = [...main, ...extra];
  return all.length
    ? all.map(p => `${p.label ? p.label + ': ' : ''}${p.number}`).join('  |  ')
    : '';
}

/** Returns address as a single line */
export function getSalonAddress(s) {
  const cfg  = s || getSalonSettings();
  const addr = cfg.address || {};
  return [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
}

/* ══════════════════════════════════════════════════════════════════════════════
   WHATSAPP BUILDER
══════════════════════════════════════════════════════════════════════════════ */

/**
 * buildWAReceipt — full receipt as WhatsApp text
 * @param {object} booking
 * @param {string} method  'cash' | 'upi' | 'card'
 */
export function buildWAReceipt(booking, method) {
  const s     = getSalonSettings();
  const amt   = booking.finalAmount   || booking.totalAmount   || 0;
  const disc  = booking.discountAmount || 0;
  const gross = booking.totalAmount   || amt;
  const date  = toDateShort(booking.date);
  const time  = booking.timeSlot?.start || '';
  const phones = getSalonPhones(s);
  const addr   = getSalonAddress(s);

  const lines = [
    `🧾 *${s.salonName} — Receipt*`,
    `━━━━━━━━━━━━━━━━━━`,
    booking.refNo  ? `Ref No   : *${booking.refNo}*`         : null,
    `Customer : ${booking.customer?.name || 'Guest'}`,
    `Service  : ${booking.service?.name  || '—'}`,
    `Stylist  : ${booking.staff?.name    || '—'}`,
    `Date     : ${date}${time ? ' · ' + time : ''}`,
    `━━━━━━━━━━━━━━━━━━`,
    disc > 0 ? `Price    : ${rs(gross)}`     : null,
    disc > 0 ? `Discount : −${rs(disc)}`     : null,
    `*Total Paid : ${rs(amt)}*`,
    `Payment  : ${method === 'cash' ? '💵 Cash' : method === 'upi' ? '📱 UPI' : '💳 Card'}`,
    s.gstNumber ? `GST No   : ${s.gstNumber}` : null,
    `━━━━━━━━━━━━━━━━━━`,
    s.receiptFooter || 'Thank you for visiting! 💛',
    phones ? `📞 ${phones}` : null,
    addr   ? `📍 ${addr}`   : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * buildWAMessage — fills a template key from settings
 * templateKey: 'msgBookingConfirm' | 'msgBookingReminder' | 'msgPaymentReceipt' | 'msgCancellation'
 */
export function buildWAMessage(templateKey, booking) {
  const s   = getSalonSettings();
  const tpl = s[templateKey] || '';
  if (!tpl) return buildWAReceipt(booking, booking.paymentMethod || 'cash');
  return fillTemplate(tpl, booking, s);
}

/** Replace all {variables} in a template string */
export function fillTemplate(tpl, booking, settings) {
  const s    = settings || getSalonSettings();
  const amt  = booking.finalAmount || booking.totalAmount || 0;
  const name = booking.customer?.name || 'Guest';
  const fn   = name.split(' ')[0];
  const addr = getSalonAddress(s);
  const phones = getSalonPhones(s);
  return tpl
    .replace(/{customerName}/g,  name)
    .replace(/%name%/g,          fn)
    .replace(/{firstName}/g,     fn)
    .replace(/{salonName}/g,     s.salonName    || 'Glamour Salon')
    .replace(/{tagline}/g,       s.tagline      || '')
    .replace(/{service}/g,       booking.service?.name  || '—')
    .replace(/{stylist}/g,       booking.staff?.name    || '—')
    .replace(/{staffName}/g,     booking.staff?.name    || '—')
    .replace(/{amount}/g,        String(amt))
    .replace(/{amountFormatted}/g, rs(amt))
    .replace(/{date}/g,          toDateShort(booking.date))
    .replace(/{time}/g,          booking.timeSlot?.start || '—')
    .replace(/{refNo}/g,         booking.refNo  || '')
    .replace(/{phone}/g,         phones)
    .replace(/{address}/g,       addr)
    .replace(/{gst}/g,           s.gstNumber    || '');
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRINT RECEIPT  — premium HTML popup, all info from settings
══════════════════════════════════════════════════════════════════════════════ */

export function printReceipt(booking, method) {
  const s     = getSalonSettings();
  const amt   = booking.finalAmount   || booking.totalAmount   || 0;
  const disc  = booking.discountAmount || 0;
  const gross = booking.totalAmount   || amt;
  const date  = toDate(booking.date);
  const time  = booking.timeSlot?.start || '';
  const addr  = getSalonAddress(s);
  const phones = (s.phoneNumbers || []).filter(p => p?.number);
  const mainPhone = s.phone || '';
  // All phones including main
  const allPhones = mainPhone
    ? [{ number: mainPhone, label: '' }, ...phones]
    : phones;
  const gst   = s.gstNumber || '';
  const taxR  = s.taxRate   || 0;
  const taxAmt = s.showGSTOnReceipt && taxR
    ? Math.round(amt * taxR / (100 + taxR))
    : 0;
  const header = s.receiptHeader || '';
  const footer = s.receiptFooter || 'Thank you for visiting! 💛';

  const phoneRows = allPhones.map(p =>
    `<div class="info-row"><span>${p.label ? p.label + ':' : '📞'}</span><span>${p.number}</span></div>`
  ).join('');

  const discRow  = disc > 0 ? `<div class="row alt"><span>Service Price</span><span>${rs(gross)}</span></div><div class="row disc"><span>✂ Discount</span><span>−${rs(disc)}</span></div>` : '';
  const taxRow   = taxAmt > 0 ? `<div class="row"><span>GST (${taxR}% incl.)</span><span>${rs(taxAmt)}</span></div>` : '';
  const gstRow   = gst ? `<div class="row alt"><span>GST Number</span><span class="mono">${gst}</span></div>` : '';
  const addrTxt  = addr ? `<div class="addr">${addr}</div>` : '';
  const headerTxt= header ? `<div class="receipt-header">${header}</div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt — ${booking.refNo || booking.customer?.name || 'Salon'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F0E8D8;padding:24px;max-width:400px;margin:auto;color:#1A1208}
    .card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 10px 50px rgba(139,100,0,0.18)}

    /* Header */
    .hdr{background:linear-gradient(155deg,#0E0B06 0%,#1C1608 50%,#0E0B06 100%);padding:28px 24px 22px;text-align:center;position:relative;overflow:hidden}
    .hdr::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%);background-size:18px 18px;opacity:.05}
    .salon-name{font-family:'Playfair Display',serif;font-size:26px;font-weight:900;color:#FAF3E0;position:relative;z-index:1;letter-spacing:.02em}
    .salon-name span{color:#DAA520}
    .tagline{font-size:9px;color:rgba(255,255,255,.28);letter-spacing:.22em;text-transform:uppercase;margin-top:4px;position:relative;z-index:1}
    .hdr-addr{font-size:10px;color:rgba(255,255,255,.35);margin-top:6px;position:relative;z-index:1;line-height:1.6}
    .hdr-phones{margin-top:8px;position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
    .phone-pill{font-size:10px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:2px 10px}
    .ref-badge{display:inline-flex;align-items:center;gap:6px;margin-top:14px;background:rgba(218,165,32,.12);border:1px solid rgba(218,165,32,.3);border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;color:#DAA520;position:relative;z-index:1}

    /* Receipt header note */
    .receipt-header{background:#FFFBEB;border-bottom:1px solid #DDD0A8;padding:10px 20px;font-size:11px;color:#6B4F00;text-align:center;font-style:italic}

    /* Body */
    .body{padding:20px 22px}
    .sec{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:#9C8660;margin:14px 0 8px}
    .sec:first-child{margin-top:0}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:4px}
    .cell{background:#F9F4EC;border-radius:10px;padding:8px 12px;border:1px solid #E8DCC4}
    .cell .cl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9C8660}
    .cell .cv{font-size:13px;font-weight:700;color:#1A1208;margin-top:2px}

    /* Pricing rows */
    .row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:12px;border-radius:8px;margin-bottom:2px}
    .row.alt{background:#F9F4EC}
    .row.disc{color:#166534;font-weight:700}
    .row .mono{font-family:monospace;font-size:11px}
    .total-box{background:linear-gradient(135deg,#FFF8E7,#FFF0C4);border:1.5px solid rgba(184,134,11,.22);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:10px}
    .total-label{font-size:14px;font-weight:800;color:#4A3018}
    .total-amt{font-family:'Playfair Display',serif;font-size:30px;font-weight:900;color:#B8860B;letter-spacing:-.01em}
    .method-badge{display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:#fff;border:1px solid #E8DCC4;border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#5C4A2A}

    /* Footer */
    .ftr{background:#FFF8E7;border-top:1px solid #DDD0A8;padding:16px 22px;text-align:center}
    .footer-txt{font-size:11px;color:#9C8660;line-height:2}
    .footer-txt strong{color:#B8860B}
    .info-row{display:flex;justify-content:space-between;font-size:10px;color:#9C8660;padding:2px 0}

    .pbtn{display:block;width:100%;margin-top:20px;padding:14px;background:linear-gradient(135deg,#8B6914,#DAA520);color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.02em}
    @media print{.pbtn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <div class="salon-name">✂ ${s.salonName || 'Glamour'}<span>.</span></div>
    ${s.tagline ? `<div class="tagline">${s.tagline}</div>` : ''}
    ${addrTxt ? `<div class="hdr-addr">${addrTxt}</div>` : ''}
    ${allPhones.length ? `<div class="hdr-phones">${allPhones.map(p => `<span class="phone-pill">${p.label ? p.label + ' · ' : '📞 '}${p.number}</span>`).join('')}</div>` : ''}
    ${booking.refNo ? `<div class="ref-badge">🧾 ${booking.refNo}</div>` : ''}
  </div>

  ${headerTxt}

  <div class="body">
    <div class="sec">Customer & Appointment</div>
    <div class="grid2">
      <div class="cell"><div class="cl">Customer</div><div class="cv">${booking.customer?.name || 'Walk-in Guest'}</div></div>
      <div class="cell"><div class="cl">Phone</div><div class="cv">${booking.customer?.phone || '—'}</div></div>
      <div class="cell"><div class="cl">Date</div><div class="cv">${date}</div></div>
      <div class="cell"><div class="cl">Time</div><div class="cv">${time || '—'}</div></div>
      <div class="cell"><div class="cl">Service</div><div class="cv">${booking.service?.name || '—'}</div></div>
      <div class="cell"><div class="cl">Stylist</div><div class="cv">${booking.staff?.name || '—'}</div></div>
    </div>

    <div class="sec" style="margin-top:16px">Payment</div>
    ${discRow}
    ${taxRow}
    ${gstRow}
    <div class="total-box">
      <span class="total-label">Total Paid</span>
      <span class="total-amt">${rs(amt)}</span>
    </div>
    <div style="text-align:center">
      <span class="method-badge">${method === 'cash' ? '💵 Cash' : method === 'upi' ? '📱 UPI' : '💳 Card'}</span>
    </div>
  </div>

  <div class="ftr">
    <div class="footer-txt">${footer}</div>
    ${s.email || s.website ? `<div class="footer-txt" style="margin-top:4px">${[s.email, s.website].filter(Boolean).join('  ·  ')}</div>` : ''}
    ${gst && s.showGSTOnReceipt !== false ? `<div class="info-row" style="justify-content:center;margin-top:8px"><span>GST No: <strong>${gst}</strong></span></div>` : ''}
    <div class="footer-txt" style="margin-top:6px;opacity:.5">Ref: ${booking.refNo || '—'}</div>
  </div>
</div>
<button class="pbtn" onclick="window.print()">🖨 &nbsp; Print Receipt</button>
</body></html>`;

  const win = window.open('', '_blank', 'width=460,height=780');
  if (win) { win.document.write(html); win.document.close(); }
  else {
    // Fallback: inject hidden div + trigger browser print (for popups blocked)
    if (!document.getElementById('__salon_ps')) {
      const st = document.createElement('style');
      st.id = '__salon_ps';
      st.textContent = '@media print{body>*{display:none!important}#__salon_pr{display:block!important}}#__salon_pr{display:none}';
      document.head.appendChild(st);
    }
    let el = document.getElementById('__salon_pr');
    if (!el) { el = document.createElement('div'); el.id = '__salon_pr'; document.body.appendChild(el); }
    el.innerHTML = html;
    window.print();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRINT INVOICE  — richer version for AdminInvoices (multi-service)
══════════════════════════════════════════════════════════════════════════════ */

export function printInvoice(inv) {
  const s      = getSalonSettings();
  const addr   = getSalonAddress(s);
  const allPhones = (() => {
    const extra = (s.phoneNumbers || []).filter(p => p?.number);
    return s.phone ? [{ number: s.phone, label: '' }, ...extra] : extra;
  })();
  const gst    = s.gstNumber || '';
  const footer = s.receiptFooter || 'Thank you for visiting! 💛';
  const fmt    = n => Number(n || 0).toLocaleString('en-IN');
  const fmtDate= d => { try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); } catch { return '—'; } };
  const fmtDt  = d => { try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); } catch { return '—'; } };
  const fmtTime= t => { if (!t) return '—'; try { const [h,m] = t.split(':').map(Number); const p = h >= 12 ? 'PM' : 'AM'; const dh = h > 12 ? h-12 : h === 0 ? 12 : h; return `${dh}:${String(m).padStart(2,'0')} ${p}`; } catch { return t; } };

  const svcs = Array.isArray(inv.services) && inv.services.length
    ? inv.services
    : [{ name: inv.service || '—', price: inv.totalAmount || 0 }];

  const svcRows = svcs.map(sv => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px dashed #DFD0A8;font-size:13px">${sv.name}${sv.duration ? ` <span style="color:#9C8660;font-size:11px">(${sv.duration}min)</span>` : ''}</td>
      <td style="text-align:right;padding:8px 0;border-bottom:1px dashed #DFD0A8;font-weight:700;font-size:13px">₹${fmt(sv.price)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceRef || inv.refNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0} body{font-family:'DM Sans',sans-serif;background:#F0E8D8;padding:20px;max-width:420px;margin:auto;color:#1A1208}
    .card{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 10px 50px rgba(139,100,0,0.18)}
    .hdr{background:linear-gradient(155deg,#0E0B06,#1C1608);padding:28px 24px 20px;text-align:center;position:relative;overflow:hidden}
    .hdr::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%);background-size:18px 18px;opacity:.05}
    .logo{font-family:'Playfair Display',serif;font-size:26px;color:#FAF3E0;position:relative;z-index:1}.logo span{color:#DAA520}
    .tagline{font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.22em;text-transform:uppercase;position:relative;z-index:1;margin-top:4px}
    .hdr-meta{font-size:10px;color:rgba(255,255,255,.35);position:relative;z-index:1;margin-top:6px;line-height:1.8}
    .phone-chips{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:8px;position:relative;z-index:1}
    .phone-chip{font-size:10px;color:rgba(255,255,255,.55);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:2px 10px}
    .ref-badge{display:inline-flex;align-items:center;gap:6px;margin-top:12px;background:rgba(218,165,32,.12);border:1px solid rgba(218,165,32,.3);border-radius:20px;padding:6px 16px;font-size:12px;font-weight:700;color:#DAA520;position:relative;z-index:1}
    .body{padding:20px 22px}
    .sec{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.18em;color:#9C8660;margin:14px 0 8px}
    .sec:first-child{margin-top:0}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    .cell{background:#F9F4EC;border-radius:10px;padding:8px 12px;border:1px solid #E8DCC4}
    .cl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9C8660}.cv{font-size:13px;font-weight:700;color:#1A1208;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    .total-row td{font-weight:900;font-size:16px;padding-top:12px;border-top:2px solid #DFD0A8;color:#B8860B}
    .disc-row td{color:#15803D;font-weight:700;padding:5px 0}
    .loyalty{background:linear-gradient(135deg,#0E0B06,#1C1608);border-radius:12px;padding:12px 16px;margin-top:14px;display:flex;align-items:center;gap:10px}
    .pts{font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:#DAA520}
    .ftr{background:#FFF8E7;border-top:1px solid #DDD0A8;padding:16px 22px;text-align:center;font-size:11px;color:#9C8660;line-height:2}
    .ftr strong{color:#B8860B}
    .pbtn{display:block;width:100%;margin-top:20px;padding:14px;background:linear-gradient(135deg,#8B6914,#DAA520);color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer}
    @media print{.pbtn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
  </style></head><body>
  <div class="card">
    <div class="hdr">
      <div class="logo">✂ ${s.salonName || 'Glamour'}<span>.</span></div>
      ${s.tagline ? `<div class="tagline">${s.tagline}</div>` : ''}
      ${addr ? `<div class="hdr-meta">${addr}</div>` : ''}
      ${allPhones.length ? `<div class="phone-chips">${allPhones.map(p => `<span class="phone-chip">${p.label ? p.label + ' · ' : '📞 '}${p.number}</span>`).join('')}</div>` : ''}
      <div class="ref-badge">🧾 ${inv.invoiceRef || inv.refNo || 'INVOICE'}</div>
    </div>
    <div class="body">
      <div class="sec">Customer & Booking</div>
      <div class="grid">
        <div class="cell"><div class="cl">Customer</div><div class="cv">${inv.customerName || 'Walk-in'}</div></div>
        <div class="cell"><div class="cl">Phone</div><div class="cv">${inv.customerPhone || '—'}</div></div>
        <div class="cell"><div class="cl">Date</div><div class="cv">${fmtDate(inv.date || inv.completedAt)}</div></div>
        <div class="cell"><div class="cl">Time</div><div class="cv">${fmtTime(inv.timeSlot?.start)}</div></div>
        <div class="cell"><div class="cl">Stylist</div><div class="cv">${inv.stylist || inv.staffName || '—'}</div></div>
        <div class="cell"><div class="cl">Payment</div><div class="cv">${(inv.paymentMethod || 'cash').toUpperCase()}</div></div>
      </div>
      <div class="sec">Services</div>
      <table><tbody>
        ${svcRows}
        ${(inv.couponDiscount || 0) > 0 ? `<tr class="disc-row"><td>🏷 Coupon (${inv.couponCode || ''})</td><td style="text-align:right">−₹${fmt(inv.couponDiscount)}</td></tr>` : ''}
        ${(inv.manualDiscount || 0) > 0  ? `<tr class="disc-row"><td>✂ Staff Discount</td><td style="text-align:right">−₹${fmt(inv.manualDiscount)}</td></tr>` : ''}
        ${gst ? `<tr><td style="font-size:11px;color:#9C8660">GST No: ${gst}</td><td></td></tr>` : ''}
        <tr class="total-row"><td>Total Paid</td><td style="text-align:right">₹${fmt(inv.finalAmount || 0)}</td></tr>
      </tbody></table>
      ${(inv.loyaltyPoints || 0) > 0 ? `<div class="loyalty"><div>⭐</div><div><div class="pts">+${inv.loyaltyPoints} Points</div><div style="font-size:10px;color:#9C8660;font-weight:600">Loyalty Points Earned</div></div></div>` : ''}
      ${inv.notes ? `<div style="background:#F9F4EC;border-radius:10px;padding:10px 14px;border:1px solid #E8DCC4;margin-top:12px;font-size:12px;color:#5C4A2A;font-style:italic">📝 ${inv.notes}</div>` : ''}
    </div>
    <div class="ftr">
      <div>${s.receiptFooter || 'Thank you for choosing <strong>' + (s.salonName || 'us') + '</strong> 💛'}</div>
      ${s.email || s.website ? `<div style="margin-top:4px">${[s.email, s.website].filter(Boolean).join(' · ')}</div>` : ''}
      <div style="margin-top:6px;opacity:.5">Ref: ${inv.invoiceRef || inv.refNo} · ${fmtDt(inv.completedAt || inv.date)}</div>
    </div>
  </div>
  <button class="pbtn" onclick="window.print()">🖨 &nbsp; Print Invoice</button>
  </body></html>`;

  const win = window.open('', '_blank', 'width=460,height=820');
  if (win) { win.document.write(html); win.document.close(); }
}