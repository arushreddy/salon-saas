import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, TrendingUp, Scissors, Award, Calendar,
  Loader2, Sparkles, BarChart2, Clock, CreditCard, Star,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Printer, MessageCircle, FileText, Hash, Banknote,
  Smartphone, Building2, Gift, Minus, ArrowUpRight,
  ArrowDownRight, Download, Info,
} from 'lucide-react';
import api from '@/services/api';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  cream:'#FDF8F0', creamMid:'#F7EFD8', creamBorder:'#DFD0A8',
  gold:'#B8860B', goldBright:'#D4A017', goldPale:'#FFF8E7',
  ink:'#16100A', inkMid:'#5A4020', inkLight:'#9C8660', inkGhost:'#D4B890',
  white:'#FFFFFF',
  green:'#065F46', greenPale:'#ECFDF5', greenBorder:'#A7F3D0',
  red:'#991B1B', redPale:'#FEF2F2', redBorder:'#FECACA',
  blue:'#1E40AF', bluePale:'#EFF6FF', blueBorder:'#BFDBFE',
  purple:'#6D28D9', purplePale:'#F5F3FF', purpleBorder:'#DDD6FE',
  orange:'#92400E', orangePale:'#FFFBEB', orangeBorder:'#FDE68A',
};

const ease = [0.22,0.61,0.36,1];
const fV = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0,transition:{duration:0.28,ease}} };
const sV = (d=0.06) => ({ hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:d}} });
const Rs = n => Number(n||0).toLocaleString('en-IN');

const PERIODS = [
  { key:'today', label:'Today' },
  { key:'week',  label:'This Week' },
  { key:'month', label:'This Month' },
  { key:'year',  label:'This Year' },
];

const TYPE_CONFIG = {
  payment:   { label:'Salary Paid',  icon:CheckCircle2, bg:C.greenPale,   border:C.greenBorder,   text:C.green,  dot:'#10B981', prefix:'+' },
  bonus:     { label:'Bonus',        icon:Gift,         bg:C.purplePale,  border:C.purpleBorder,  text:C.purple, dot:'#7C3AED', prefix:'+' },
  deduction: { label:'Deduction',    icon:Minus,        bg:C.redPale,     border:C.redBorder,     text:C.red,    dot:'#EF4444', prefix:'−' },
  advance:   { label:'Advance',      icon:ArrowUpRight, bg:C.bluePale,    border:C.blueBorder,    text:C.blue,   dot:'#3B82F6', prefix:'+' },
};

const PAY_METHOD_LABEL = {
  cash:'💵 Cash', upi:'📱 UPI', bank:'🏦 Bank Transfer', cheque:'📋 Cheque', other:'💳 Other',
};

const fmtDate   = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtMonth  = m => new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const fmtShortM = m => new Date(m+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
const getThisMonth = () => {
  const n = new Date(Date.now() + 5.5*60*60*1000);
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
};

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
const Spark = ({ vals=[], color='#B8860B', h=32, w=80 }) => {
  if (!vals||vals.length<2) return null;
  const max = Math.max(...vals, 1);
  const pts = vals.map((v,i)=>`${(i/(vals.length-1))*w},${h-(v/max)*h*0.85}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{flexShrink:0}}>
      <defs><linearGradient id="sg" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
        <stop offset="100%" stopColor={color} stopOpacity="1"/>
      </linearGradient></defs>
      <polyline fill="none" stroke="url(#sg)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts}/>
    </svg>
  );
};

// ── Mini bar chart ────────────────────────────────────────────────────────────
const Bars = ({ data=[], color=C.gold }) => {
  if (!data.length) return <div className="flex items-center justify-center h-20 text-xs" style={{color:C.inkGhost}}>No data</div>;
  const max = Math.max(...data.map(d=>d.revenue||0), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
          <div className="relative w-full rounded-t-md transition-all"
            style={{height:`${Math.max(4,((d.revenue||0)/max)*100)}%`, background:`${color}${i===data.length-1?'':'88'}`}}>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
              ₹{Rs(d.revenue)}
            </div>
          </div>
          <span className="text-[8px] font-semibold" style={{color:C.inkGhost}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Salary breakdown card ─────────────────────────────────────────────────────
const SalaryBreakdown = ({ s, loading }) => {
  if (loading || !s) return null;
  const isPaid   = s.salaryPaid >= s.netSalary && s.netSalary > 0;
  const isPartial = s.alreadyPaid > 0 && s.alreadyPaid < s.netSalary;

  const rows = [
    { label:'Base Salary',     value:s.baseSalary,           color:C.ink,    prefix:'' },
    s.commissionEnabled && s.commissionThisMonth > 0
      ? { label:`Commission (${s.commissionPct}% × ₹${Rs(s.thisMonthRevenue||0)})`, value:s.commissionThisMonth, color:C.purple, prefix:'+' }
      : null,
    s.bonusThisMonth > 0
      ? { label:'Bonus',       value:s.bonusThisMonth,       color:C.green,  prefix:'+' }
      : null,
    s.deductThisMonth > 0
      ? { label:'Deductions',  value:s.deductThisMonth,      color:C.red,    prefix:'−' }
      : null,
  ].filter(Boolean);

  return (
    <motion.div variants={fV} className="rounded-2xl overflow-hidden"
      style={{background:C.white, border:`1.5px solid ${isPaid?C.greenBorder:s.balanceDue>0?C.orangeBorder:C.creamBorder}`}}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{background:isPaid?C.greenPale:s.balanceDue>0?C.orangePale:C.goldPale,
          borderBottom:`1px solid ${isPaid?C.greenBorder:s.balanceDue>0?C.orangeBorder:C.creamBorder}`}}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{color:C.inkLight}}>
            Salary · {fmtMonth(s.thisMonth)}
          </p>
          <p className="text-2xl font-black mt-0.5" style={{color:C.gold, fontFamily:"'Playfair Display',serif"}}>
            ₹{Rs(s.netSalary)}
          </p>
          <p className="text-[11px] mt-0.5" style={{color:C.inkLight}}>Net payable this month</p>
        </div>
        <div className="text-right">
          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{background:C.greenPale, color:C.green, border:`1px solid ${C.greenBorder}`}}>
              <CheckCircle2 size={12}/> Fully Paid
            </span>
          ) : isPartial ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{background:C.orangePale, color:C.orange, border:`1px solid ${C.orangeBorder}`}}>
              <Clock size={12}/> Partial
            </span>
          ) : s.balanceDue > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{background:C.orangePale, color:C.orange, border:`1px solid ${C.orangeBorder}`}}>
              <AlertCircle size={12}/> Due: ₹{Rs(s.balanceDue)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Breakdown rows */}
      <div className="divide-y" style={{borderColor:C.creamBorder+'66'}}>
        {rows.map((r,i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3"
            style={{background:i%2===0?C.white:C.cream}}>
            <p className="text-sm" style={{color:C.inkMid}}>{r.label}</p>
            <p className="text-sm font-bold" style={{color:r.color}}>
              {r.prefix && <span className="mr-0.5">{r.prefix}</span>}₹{Rs(r.value)}
            </p>
          </div>
        ))}
        {/* Gross */}
        <div className="flex items-center justify-between px-5 py-3 font-bold"
          style={{background:C.cream}}>
          <p className="text-sm" style={{color:C.inkMid}}>Gross Salary</p>
          <p className="text-sm font-bold" style={{color:C.ink}}>₹{Rs(s.grossSalary)}</p>
        </div>
        {/* Deductions summary */}
        {s.deductThisMonth > 0 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{background:C.white}}>
            <p className="text-sm" style={{color:C.red}}>Total Deductions</p>
            <p className="text-sm font-bold" style={{color:C.red}}>−₹{Rs(s.deductThisMonth)}</p>
          </div>
        )}
        {/* NET */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{background:C.goldPale}}>
          <p className="font-bold" style={{color:C.ink}}>Net Payable</p>
          <p className="text-xl font-black" style={{color:C.gold, fontFamily:"'Playfair Display',serif"}}>
            ₹{Rs(s.netSalary)}
          </p>
        </div>
        {/* Already paid */}
        {s.alreadyPaid > 0 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{background:C.greenPale}}>
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{color:C.green}}>
              <CheckCircle2 size={12}/> Already Paid
            </p>
            <p className="text-sm font-bold" style={{color:C.green}}>₹{Rs(s.alreadyPaid)}</p>
          </div>
        )}
        {/* Balance due */}
        {s.balanceDue > 0 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{background:C.orangePale}}>
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{color:C.orange}}>
              <AlertCircle size={12}/> Balance Due
            </p>
            <p className="text-lg font-black" style={{color:C.orange, fontFamily:"'Playfair Display',serif"}}>
              ₹{Rs(s.balanceDue)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Salary record row ─────────────────────────────────────────────────────────
const SalaryRecordRow = ({ r }) => {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.payment;
  const Icon = cfg.icon;

  const printPayslip = () => {
    const win = window.open('','_blank','width=460,height=820');
    win.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F8F3EA;padding:24px;max-width:420px;margin:auto}
    .card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
    .hdr{background:linear-gradient(135deg,#16100A,#2d2510);padding:22px;text-align:center;position:relative}
    .hdr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%);background-size:14px 14px;opacity:.08}
    .logo{font-family:'Playfair Display',serif;font-size:22px;color:#fff;position:relative}.logo span{color:#D4A017}
    .badge{display:inline-block;margin-top:8px;background:rgba(212,160,23,.15);border:1px solid rgba(212,160,23,.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;color:#D4A017;position:relative}
    .body{padding:20px}.sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#9C8660;margin:14px 0 8px}
    .row{display:flex;justify-content:space-between;padding:7px 12px;font-size:13px;border-radius:8px}
    .alt{background:#FDF8F0}.v{font-weight:700}.gold{color:#B8860B;font-weight:800}.green{color:#065F46;font-weight:700}.red{color:#991B1B;font-weight:700}
    .divider{border-top:2px solid #DFD0A8;margin:8px 0}
    .receipt{width:100%;max-height:200px;object-fit:contain;border-radius:10px;margin-top:8px;border:1px solid #DFD0A8}
    .ftr{background:#FDF8F0;border-top:1px solid #EDE0C0;padding:14px;text-align:center;font-size:11px;color:#9C8660;line-height:1.9}
    .btn{display:block;width:100%;padding:12px;background:linear-gradient(135deg,#B8860B,#D4A017);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:16px}
    @media print{.btn{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}</style></head><body>
    <div class="card">
      <div class="hdr">
        <div class="logo">✂ Glamour<span>.</span></div>
        <div style="font-size:10px;color:#9C8660;letter-spacing:.14em;text-transform:uppercase;margin-top:3px;position:relative">Salary Payslip</div>
        <div class="badge">📄 ${fmtMonth(r.month)}</div>
      </div>
      <div class="body">
        <div class="sec">Record Details</div>
        <div class="row alt"><span>Type</span><span class="v">${cfg.label}</span></div>
        <div class="row"><span>Month</span><span class="v">${fmtMonth(r.month)}</span></div>
        <div class="row alt"><span>Date Paid</span><span class="v">${fmtDate(r.paidAt)}</span></div>
        ${r.referenceNo ? `<div class="row"><span>Ref / Txn ID</span><span class="v" style="font-family:monospace">${r.referenceNo}</span></div>` : ''}
        <div class="row alt"><span>Payment Method</span><span class="v">${PAY_METHOD_LABEL[r.paymentMethod]||r.paymentMethod||'—'}</span></div>
        ${r.note ? `<div class="row"><span>Note</span><span class="v">${r.note}</span></div>` : ''}
        ${r.baseSalary > 0 ? `
        <div class="sec">Salary Breakdown</div>
        <div class="row alt"><span>Base Salary</span><span class="v">₹${Rs(r.baseSalary)}</span></div>
        ${r.commissionAmount > 0 ? `<div class="row"><span>Commission (${r.commissionPercent}%)</span><span class="green">+₹${Rs(r.commissionAmount)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row alt"><span style="font-weight:800">Amount</span><span class="gold" style="font-size:15px">₹${Rs(r.amount)}</span></div>
        ` : `
        <div class="sec">Amount</div>
        <div class="row alt"><span style="font-weight:800">${cfg.label}</span><span class="${r.type==='deduction'?'red':'gold'}" style="font-size:15px">${r.type==='deduction'?'−':'+'}₹${Rs(r.amount)}</span></div>
        `}
        ${r.receiptImage ? `<div class="sec">Payment Receipt</div><img src="${r.receiptImage}" class="receipt" alt="receipt"/>` : ''}
      </div>
      <div class="ftr"><strong style="color:#B8860B">Glamour Salon</strong> · ${fmtDate(r.paidAt)}</div>
    </div>
    <button class="btn" onclick="window.print()">🖨 Print Payslip</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{border:`1px solid ${open?cfg.border:C.creamBorder}`}}>
      {/* Main row */}
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left transition-all hover:opacity-90"
        style={{background:open?cfg.bg:C.white}}>
        {/* Type icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background:`${cfg.dot}18`}}>
          <Icon size={15} style={{color:cfg.dot}}/>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{color:cfg.text}}>{cfg.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{background:`${cfg.dot}15`, color:cfg.dot}}>
              {fmtShortM(r.month)}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{color:C.inkLight}}>
            {r.note || PAY_METHOD_LABEL[r.paymentMethod] || '—'}
            {r.referenceNo && ` · ${r.referenceNo}`}
          </p>
        </div>
        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-black" style={{color:r.type==='deduction'?C.red:C.green, fontFamily:"'Playfair Display',serif"}}>
            {cfg.prefix}₹{Rs(r.amount)}
          </p>
          <p className="text-[10px]" style={{color:C.inkLight}}>{fmtDate(r.paidAt)}</p>
        </div>
        {/* Expand arrow */}
        <div className="flex-shrink-0 ml-1">
          {open ? <ChevronUp size={14} style={{color:C.inkLight}}/> : <ChevronDown size={14} style={{color:C.inkLight}}/>}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 space-y-3" style={{borderTop:`1px solid ${cfg.border}`}}>
              {/* Details grid */}
              <div className="rounded-xl overflow-hidden text-xs" style={{border:`1px solid ${C.creamBorder}`}}>
                {[
                  ['Month', fmtMonth(r.month)],
                  ['Payment Method', PAY_METHOD_LABEL[r.paymentMethod]||r.paymentMethod||'—'],
                  r.referenceNo && ['Transaction Ref', r.referenceNo],
                  r.baseSalary > 0 && ['Base Salary', `₹${Rs(r.baseSalary)}`],
                  r.commissionAmount > 0 && [`Commission (${r.commissionPercent}%)`, `+₹${Rs(r.commissionAmount)}`],
                  r.note && ['Note', r.note],
                  ['Date', fmtDate(r.paidAt)],
                ].filter(Boolean).map(([k,v],i)=>(
                  <div key={k} className="flex justify-between px-3 py-2.5"
                    style={{background:i%2===0?C.white:C.cream, borderBottom:i<5?`1px solid ${C.creamBorder+'44'}`:'none'}}>
                    <span style={{color:C.inkLight}}>{k}</span>
                    <span className="font-bold text-right" style={{color:C.ink,maxWidth:'60%',wordBreak:'break-all'}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Receipt image if uploaded */}
              {r.receiptImage && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{color:C.inkLight}}>Payment Receipt</p>
                  <img src={r.receiptImage} alt="receipt"
                    className="w-full rounded-xl object-contain border"
                    style={{maxHeight:160, border:`1px solid ${C.creamBorder}`}}/>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={printPayslip}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                  style={{background:C.ink, color:'#fff'}}>
                  <Printer size={12}/> Print Payslip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function StaffEarnings() {
  const [period,  setPeriod]  = useState('month');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('salary'); // salary | overview | history | breakdown

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff/my/earnings', { params:{ period } });
      setData(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;

  // Build bar data
  const barData = (() => {
    if (!data) return [];
    const src = (period==='year'||period==='month')
      ? Object.entries(data.monthlyData||{}).sort(([a],[b])=>a.localeCompare(b)).slice(-6)
          .map(([k,d])=>({ label:new Date(k+'-01').toLocaleDateString('en-IN',{month:'short'}), revenue:d.revenue }))
      : Object.entries(data.dailyData||{}).sort(([a],[b])=>a.localeCompare(b)).slice(-14)
          .map(([k,d])=>({ label:new Date(k+'T12:00').getDate()+'', revenue:d.revenue }));
    return src;
  })();

  const sparkVals = barData.map(d=>d.revenue);

  const thisMonthRecords = data?.thisMonthRecords || [];
  const allRecords       = data?.salaryRecords || [];

  return (
    <motion.div variants={sV()} initial="hidden" animate="show" className="space-y-5 pb-10"
      style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── Header banner ────────────────────────────────────────────────── */}
      <motion.div variants={fV} className="relative overflow-hidden rounded-2xl p-6"
        style={{background:`linear-gradient(135deg,#1c1408,#2d2010)`}}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{backgroundImage:'repeating-linear-gradient(45deg,#B8860B 0,#B8860B 1px,transparent 0,transparent 50%)',backgroundSize:'14px 14px'}}/>
        <div className="relative flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={11} style={{color:'#F0D878'}}/>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{color:'#F0D878'}}>Earnings & Salary</span>
            </div>
            <h1 className="text-2xl font-black text-white" style={{fontFamily:"'Playfair Display',serif"}}>My Earnings</h1>
            {s && (
              <>
                <p className="text-3xl font-black mt-2" style={{color:'#F0D878', fontFamily:"'Playfair Display',serif"}}>
                  ₹{Rs(s.netSalary)}
                </p>
                <p className="text-xs mt-1" style={{color:'#7a6040'}}>
                  Net salary · {fmtMonth(s.thisMonth)}
                  {s.balanceDue > 0
                    ? <span style={{color:'#FDE68A'}}> · ₹{Rs(s.balanceDue)} due</span>
                    : s.alreadyPaid >= s.netSalary && s.netSalary > 0
                    ? <span style={{color:'#6EE7B7'}}> · ✓ Fully paid</span>
                    : null}
                </p>
              </>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PERIODS.map(p=>(
              <button key={p.key} onClick={()=>setPeriod(p.key)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: period===p.key ? '#D4A017' : 'rgba(255,255,255,0.08)',
                  color: period===p.key ? '#1c1408' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${period===p.key?'transparent':'rgba(255,255,255,0.1)'}`,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{background:`linear-gradient(135deg,${C.gold},${C.goldBright})`}}>
            <Loader2 size={20} className="text-white animate-spin"/>
          </div>
          <p className="text-sm" style={{color:C.inkLight}}>Loading earnings…</p>
        </div>
      ) : !s ? (
        <div className="rounded-2xl p-12 text-center" style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
          <IndianRupee size={32} style={{color:C.creamBorder, margin:'0 auto 12px'}}/>
          <p className="font-bold" style={{color:C.inkLight}}>No earnings data yet</p>
          <p className="text-xs mt-1" style={{color:C.inkGhost}}>Complete appointments to see your earnings here</p>
        </div>
      ) : (
        <>
          {/* ── KPI row ────────────────────────────────────────────────── */}
          <motion.div variants={sV(0.05)} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Services Done',    val:s.totalServices,                       icon:Scissors,    color:C.gold,    bg:C.goldPale,    spark:sparkVals },
              { label:'Revenue Generated',val:`₹${Rs(s.totalRevenue)}`,              icon:TrendingUp,  color:C.green,   bg:C.greenPale },
              { label:`Commission (${s.commissionPct}%)`, val:`₹${Rs(s.commissionEnabled?s.commissionThisMonth:0)}`, icon:Award, color:C.purple, bg:C.purplePale,
                sub: s.commissionEnabled ? `${s.commissionPct}% of revenue` : 'Commission off' },
              { label:'Avg per Service',  val:`₹${Rs(s.avgTicket)}`,                icon:Star,        color:C.blue,    bg:C.bluePale },
            ].map(({ label, val, icon:Icon, color, bg, sub, spark })=>(
              <motion.div key={label} variants={fV} className="rounded-2xl p-4"
                style={{background:bg, border:`1.5px solid ${color}20`}}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${color}18`}}>
                    <Icon size={14} style={{color}}/>
                  </div>
                  {spark && <Spark vals={spark} color={color}/>}
                </div>
                <p className="text-xl font-black" style={{color, fontFamily:"'Playfair Display',serif"}}>{val}</p>
                <p className="text-[10px] font-bold mt-0.5" style={{color:`${color}88`}}>{label}</p>
                {sub && <p className="text-[9px] mt-0.5" style={{color:C.inkGhost}}>{sub}</p>}
              </motion.div>
            ))}
          </motion.div>

          {/* ── Tabs ───────────────────────────────────────────────────── */}
          <motion.div variants={fV} className="flex gap-1 p-1.5 rounded-2xl" style={{background:C.creamMid}}>
            {[
              ['salary',    '💰 Salary'],
              ['payslips',  '📄 Payslips'],
              ['overview',  '📊 Charts'],
              ['history',   '📋 Services'],
            ].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: tab===k ? C.white : 'transparent',
                  color: tab===k ? C.ink : C.inkLight,
                  boxShadow: tab===k ? '0 1px 6px rgba(0,0,0,0.07)' : 'none',
                }}>
                {l}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">

            {/* ── SALARY TAB ─────────────────────────────────────────── */}
            {tab==='salary' && (
              <motion.div key="sal" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="space-y-4">
                <SalaryBreakdown s={s} loading={loading}/>

                {/* This month's admin records preview */}
                {thisMonthRecords.length > 0 && (
                  <motion.div variants={fV} className="rounded-2xl overflow-hidden"
                    style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
                    <div className="px-5 py-3 flex items-center gap-2" style={{borderBottom:`1px solid ${C.creamBorder}`,background:C.cream}}>
                      <FileText size={13} style={{color:C.gold}}/>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.inkLight}}>
                        This month's transactions
                      </p>
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{background:C.goldPale, color:C.gold}}>{thisMonthRecords.length}</span>
                    </div>
                    <div className="divide-y" style={{borderColor:C.creamBorder+'44'}}>
                      {thisMonthRecords.map((r,i)=>{
                        const cfg = TYPE_CONFIG[r.type]||TYPE_CONFIG.payment;
                        const Icon = cfg.icon;
                        return (
                          <div key={r._id||i} className="flex items-center gap-3 px-4 py-3"
                            style={{background:i%2===0?C.white:C.cream}}>
                            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                              style={{background:`${cfg.dot}15`}}>
                              <Icon size={13} style={{color:cfg.dot}}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate" style={{color:C.ink}}>{cfg.label}</p>
                              <p className="text-[10px] truncate" style={{color:C.inkLight}}>
                                {r.note||PAY_METHOD_LABEL[r.paymentMethod]||'—'}
                                {r.referenceNo && ` · ${r.referenceNo}`}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black"
                                style={{color:r.type==='deduction'?C.red:C.green, fontFamily:"'Playfair Display',serif"}}>
                                {cfg.prefix}₹{Rs(r.amount)}
                              </p>
                              <p className="text-[9px]" style={{color:C.inkGhost}}>{fmtDate(r.paidAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {thisMonthRecords.length === 0 && (
                  <motion.div variants={fV} className="rounded-2xl p-8 text-center"
                    style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
                    <Clock size={24} style={{color:C.creamBorder, margin:'0 auto 10px'}}/>
                    <p className="text-sm font-semibold" style={{color:C.inkLight}}>No salary transactions this month yet</p>
                    <p className="text-xs mt-1" style={{color:C.inkGhost}}>
                      Salary payments from admin will appear here
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── PAYSLIPS TAB ────────────────────────────────────────── */}
            {tab==='payslips' && (
              <motion.div key="ps" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="space-y-3">
                {allRecords.length === 0 ? (
                  <div className="rounded-2xl p-12 text-center" style={{background:C.white, border:`1px solid ${C.creamBorder}`}}>
                    <FileText size={28} style={{color:C.creamBorder, margin:'0 auto 12px'}}/>
                    <p className="font-bold" style={{color:C.inkLight}}>No payslips yet</p>
                    <p className="text-xs mt-1" style={{color:C.inkGhost}}>
                      Salary payments and adjustments from your manager will appear here
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary pills */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['Payments',    allRecords.filter(r=>r.type==='payment').reduce((s,r)=>s+r.amount,0),    C.green,  '+'],
                        ['Bonuses',     allRecords.filter(r=>r.type==='bonus').reduce((s,r)=>s+r.amount,0),      C.purple, '+'],
                        ['Deductions',  allRecords.filter(r=>r.type==='deduction').reduce((s,r)=>s+r.amount,0),  C.red,    '−'],
                      ].map(([l,v,c,p])=>v>0&&(
                        <span key={l} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                          style={{background:`${c}12`, color:c, border:`1px solid ${c}22`}}>
                          {p}₹{Rs(v)} {l}
                        </span>
                      ))}
                    </div>
                    {allRecords.map(r=><SalaryRecordRow key={r._id} r={r}/>)}
                  </>
                )}
              </motion.div>
            )}

            {/* ── CHARTS TAB ──────────────────────────────────────────── */}
            {tab==='overview' && (
              <motion.div key="ov" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="space-y-4">
                <div className="rounded-2xl p-5 bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
                  <p className="text-xs font-black uppercase tracking-wider mb-4" style={{color:C.inkLight}}>
                    Revenue Trend · {period==='week'||period==='today' ? 'Daily' : 'Monthly'}
                  </p>
                  <Bars data={barData} color={C.gold}/>
                </div>
                {/* Service breakdown */}
                {data?.topServices?.length > 0 && (
                  <div className="rounded-2xl p-5 bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
                    <p className="text-xs font-black uppercase tracking-wider mb-4" style={{color:C.inkLight}}>Top Services</p>
                    <div className="space-y-3">
                      {data.topServices.map((sv,i) => {
                        const max = data.topServices[0]?.revenue||1;
                        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                        return (
                          <div key={sv.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span>{medals[i]}</span>
                                <p className="text-xs font-bold" style={{color:C.ink}}>{sv.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black" style={{color:C.gold}}>₹{Rs(sv.revenue)}</p>
                                <p className="text-[10px]" style={{color:C.inkLight}}>{sv.count} done</p>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{background:C.creamMid}}>
                              <motion.div className="h-full rounded-full"
                                initial={{width:0}} animate={{width:`${Math.round((sv.revenue/max)*100)}%`}}
                                transition={{duration:0.7,ease}}
                                style={{background:`linear-gradient(90deg,${C.gold},${C.goldBright})`}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SERVICE HISTORY TAB ─────────────────────────────────── */}
            {tab==='history' && (
              <motion.div key="hist" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="rounded-2xl overflow-hidden bg-white" style={{border:`1px solid ${C.creamBorder}`}}>
                <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:`1px solid ${C.creamBorder}`,background:C.cream}}>
                  <Scissors size={13} style={{color:C.gold}}/>
                  <p className="text-xs font-black uppercase tracking-wider" style={{color:C.inkLight}}>
                    Completed Services · {data?.recentBookings?.length||0} records
                  </p>
                </div>
                {!data?.recentBookings?.length ? (
                  <div className="p-12 text-center">
                    <p className="text-sm" style={{color:C.inkLight}}>No completed services yet</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{borderColor:C.creamBorder+'66'}}>
                    {data.recentBookings.map((b,i)=>(
                      <div key={b._id||i} className="flex items-center gap-3 px-4 py-3"
                        style={{background:i%2===0?C.white:C.cream}}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{background:C.goldPale, color:C.gold}}>
                          {(b.customer?.name||'?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{color:C.ink}}>{b.customer?.name||'Walk-in'}</p>
                          <p className="text-[10px]" style={{color:C.inkLight}}>
                            {b.service?.name||'—'} · {b.date?new Date(b.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'—'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-black" style={{color:C.gold, fontFamily:"'Playfair Display',serif"}}>
                            ₹{Rs(b.finalAmount)}
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{background:b.paymentStatus==='paid'?C.greenPale:C.orangePale,
                              color:b.paymentStatus==='paid'?C.green:C.orange}}>
                            {b.paymentStatus==='paid'?'✓ Paid':'Unpaid'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}