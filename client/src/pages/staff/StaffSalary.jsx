import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, CheckCircle2, AlertCircle, Clock, Gift, Minus, ArrowUpRight,
  FileText, Loader2, Printer, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Banknote,
} from 'lucide-react';
import api from '@/services/api';

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } };
const stagger = (d = 0.05) => ({ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: d } } });
const Rs = n => Number(n || 0).toLocaleString('en-IN');

const TYPE_CFG = {
  payment: { label: 'Salary Payment', icon: CheckCircle2, bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', prefix: '+' },
  bonus: { label: 'Bonus', icon: Gift, bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9', prefix: '+' },
  deduction: { label: 'Deduction', icon: Minus, bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', prefix: '−' },
  advance: { label: 'Advance', icon: ArrowUpRight, bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', prefix: '+' },
};

const PAY = { cash: 'Cash', upi: 'UPI', bank: 'Bank Transfer', cheque: 'Cheque', other: 'Other' };
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtMonth = m => new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PayslipRow = ({ r }) => {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CFG[r.type] || TYPE_CFG.payment;
  const Icon = cfg.icon;

  const printPayslip = () => {
    const w = window.open('', '_blank', 'width=440,height=700');
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#f8f8f6;padding:24px;max-width:400px;margin:auto}
.c{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee}
.h{background:#1a1a1a;padding:20px;text-align:center}.l{font-family:'Playfair Display',serif;font-size:18px;color:#fff}.l span{color:#D4A017}
.b{padding:16px}.s{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#999;margin:14px 0 6px}
.r{display:flex;justify-content:space-between;padding:8px 10px;font-size:13px;border-radius:6px}.a{background:#fafaf8}.v{font-weight:600}
.f{background:#fafaf8;border-top:1px solid #eee;padding:12px;text-align:center;font-size:11px;color:#999}
.p{display:block;width:100%;padding:10px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:16px}
@media print{.p{display:none}}</style></head><body>
<div class="c"><div class="h"><div class="l">Glamour<span>.</span></div>
<div style="font-size:10px;color:#888;letter-spacing:.08em;text-transform:uppercase;margin-top:4px">Payslip · ${fmtMonth(r.month)}</div></div>
<div class="b"><div class="s">Details</div>
<div class="r a"><span>Type</span><span class="v">${cfg.label}</span></div>
<div class="r"><span>Date</span><span class="v">${fmtDate(r.paidAt)}</span></div>
<div class="r a"><span>Method</span><span class="v">${PAY[r.paymentMethod]||r.paymentMethod||'—'}</span></div>
${r.referenceNo?`<div class="r"><span>Ref</span><span class="v">${r.referenceNo}</span></div>`:''}
${r.note?`<div class="r a"><span>Note</span><span class="v">${r.note}</span></div>`:''}
<div class="s">Amount</div>
<div class="r a"><span style="font-weight:700">${cfg.label}</span>
<span class="v" style="font-size:16px;color:${r.type==='deduction'?'#991B1B':'#166534'}">${cfg.prefix}₹${Rs(r.amount)}</span></div>
</div><div class="f">Glamour Salon · ${fmtDate(r.paidAt)}</div></div>
<button class="p" onclick="window.print()">Print Payslip</button></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${open ? cfg.border : '#eee'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', textAlign: 'left', background: open ? cfg.bg : '#fff', border: 'none', cursor: 'pointer',
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${cfg.color}10` }}>
          <Icon size={15} style={{ color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{cfg.label}</span>
            <span style={{ fontSize: 11, padding: '1px 5px', borderRadius: 4, background: '#f5f5f5', color: '#888' }}>
              {new Date(r.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.note || PAY[r.paymentMethod] || '—'}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: r.type === 'deduction' ? '#991B1B' : '#166534', fontFamily: "'Playfair Display',serif" }}>
            {cfg.prefix}₹{Rs(r.amount)}
          </p>
          <p style={{ fontSize: 10, color: '#ccc' }}>{fmtDate(r.paidAt)}</p>
        </div>
        {open ? <ChevronUp size={13} style={{ color: '#ccc' }} /> : <ChevronDown size={13} style={{ color: '#ccc' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${cfg.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                {[['Month', fmtMonth(r.month)], ['Method', PAY[r.paymentMethod] || '—'], r.referenceNo && ['Reference', r.referenceNo], ['Date', fmtDate(r.paidAt)], r.note && ['Note', r.note]]
                  .filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{ padding: '6px 10px', background: '#FAFAF8', borderRadius: 8 }}>
                      <p style={{ fontSize: 10, color: '#bbb', marginBottom: 1 }}>{k}</p>
                      <p style={{ fontSize: 13, color: '#333', fontWeight: 500, wordBreak: 'break-word' }}>{v}</p>
                    </div>
                  ))}
              </div>
              {r.receiptImage && <img src={r.receiptImage} alt="Receipt" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee', marginTop: 8 }} />}
              <button onClick={printPayslip} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '8px 0', marginTop: 10, borderRadius: 8,
                background: '#1a1a1a', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <Printer size={12} /> Print Payslip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function StaffSalary() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const [year, setYear] = useState(ist.getFullYear());
  const [month, setMonth] = useState(ist.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const isCurrentMonth = year === ist.getFullYear() && month === ist.getMonth() + 1;

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (!isCurrentMonth) { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); } };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data: res } = await api.get('/staff/my/earnings', { params: { period: 'month' } }); setData(res); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const allRecords = (data?.salaryRecords || []).filter(r => !monthStr || r.month === monthStr || !isCurrentMonth);
  const monthRecords = (data?.salaryRecords || []).filter(r => r.month === monthStr);
  const displayRecords = isCurrentMonth ? (data?.salaryRecords || []) : monthRecords;

  const isPaid = s && s.alreadyPaid >= s.netSalary && s.netSalary > 0;
  const isPartial = s && s.alreadyPaid > 0 && s.alreadyPaid < s.netSalary;

  return (
    <motion.div variants={stagger()} initial="hidden" animate="show" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* Header with month nav */}
      <motion.div variants={fade} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Playfair Display',serif" }}>My Salary</h1>
          <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Breakdown & payslips</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevMonth} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #eee', cursor: 'pointer' }}>
            <ChevronLeft size={14} style={{ color: '#666' }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333', minWidth: 80, textAlign: 'center' }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #eee', cursor: 'pointer', opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={14} style={{ color: '#666' }} />
          </button>
        </div>
      </motion.div>

      {/* Net salary hero (only for current month) */}
      {isCurrentMonth && (
        <motion.div variants={fade} style={{
          background: '#1a1a1a', borderRadius: 16, padding: '24px 22px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(184,134,11,0.12),transparent)' }} />
          <p style={{ fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Net Salary · {fmtMonth(s?.thisMonth || monthStr)}
          </p>
          {loading ? (
            <Loader2 size={18} className="animate-spin" style={{ color: '#666', marginTop: 8 }} />
          ) : s ? (
            <>
              <p style={{ fontSize: 30, fontWeight: 700, color: '#F5E6B8', marginTop: 6, fontFamily: "'Playfair Display',serif" }}>₹{Rs(s.netSalary)}</p>
              <div style={{ marginTop: 10 }}>
                {isPaid ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <CheckCircle2 size={11} /> Fully Paid
                  </span>
                ) : isPartial ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#FDE68A' }}>
                    <Clock size={11} /> ₹{Rs(s.balanceDue)} remaining
                  </span>
                ) : s.balanceDue > 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                    <AlertCircle size={11} /> ₹{Rs(s.balanceDue)} due
                  </span>
                ) : null}
              </div>
            </>
          ) : <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>No salary data</p>}
        </motion.div>
      )}

      {/* Breakdown (current month only) */}
      {isCurrentMonth && s && (
        <motion.div variants={fade} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f3f3', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={13} style={{ color: '#aaa' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Breakdown · {MONTHS[month - 1]}
            </span>
          </div>
          {[
            { label: 'Base Salary', val: s.baseSalary, color: '#333', show: true },
            { label: `Commission (${s.commissionPct}%)`, val: s.commissionThisMonth, color: '#6D28D9', prefix: '+', show: s.commissionEnabled && s.commissionThisMonth > 0 },
            { label: 'Bonus', val: s.bonusThisMonth, color: '#166534', prefix: '+', show: s.bonusThisMonth > 0 },
            { label: 'Gross', val: s.grossSalary, color: '#333', show: true, bold: true },
            { label: 'Deductions', val: s.deductThisMonth, color: '#991B1B', prefix: '−', show: s.deductThisMonth > 0 },
            { label: 'Net Payable', val: s.netSalary, color: '#B8860B', show: true, bold: true, big: true },
            { label: 'Paid', val: s.alreadyPaid, color: '#166534', show: s.alreadyPaid > 0 },
            { label: 'Balance Due', val: s.balanceDue, color: '#92400E', show: s.balanceDue > 0, bold: true },
          ].filter(r => r.show).map(({ label, val, color, prefix, bold, big }, i) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: big ? '14px 18px' : '11px 18px', background: i % 2 === 0 ? '#fff' : '#FAFAF8',
            }}>
              <p style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: bold ? '#333' : '#999' }}>{label}</p>
              <p style={{ fontSize: big ? 18 : 14, fontWeight: 700, color, fontFamily: big ? "'Playfair Display',serif" : undefined }}>
                {prefix && <span>{prefix}</span>}₹{Rs(val)}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Payslip History */}
      <motion.div variants={fade}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Banknote size={14} style={{ color: '#aaa' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Payslips {!isCurrentMonth && `· ${MONTHS[month - 1]} ${year}`}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#B8860B', background: '#FBF6EE', padding: '2px 8px', borderRadius: 6 }}>
            {displayRecords.length}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Loader2 size={18} className="animate-spin" style={{ color: '#B8860B' }} />
          </div>
        ) : displayRecords.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
            <Banknote size={24} style={{ color: '#e5e5e5', margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 600, color: '#aaa' }}>No payslips {!isCurrentMonth && `for ${MONTHS[month - 1]} ${year}`}</p>
            <p style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>Salary payments from admin will show here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayRecords.map(r => <PayslipRow key={r._id} r={r} />)}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}