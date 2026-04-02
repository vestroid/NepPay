(() => {
const STORAGE_KEY = "neppay.auth";
const APP_NAME = "NepPay";
const DEFAULT_REDIRECT = "/dashboard";
const NAV_ITEMS = [
  { path: "/dashboard", label: "Home",       icon: "grid" },
  { path: "/send",      label: "Send",        icon: "send" },
  { path: "/receive",   label: "Receive",     icon: "qr" },
  { path: "/statements",label: "Statements",  icon: "list" },
  { path: "/statistics",label: "Reports",     icon: "chart" },
  { path: "/settings",  label: "Profile",     icon: "user" },
];
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

/* ── Icons ── */
function Icon({ name, size = 18 }) {
  const s = { width: size, height: size, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:"1.8", strokeLinecap:"round", strokeLinejoin:"round", "aria-hidden":"true" };
  const icons = {
    grid:    <svg {...s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
    send:    <svg {...s}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>,
    qr:      <svg {...s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M15 15h.01M19 15h.01M15 19h.01M19 19h.01M17 17h.01"/></svg>,
    list:    <svg {...s}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
    chart:   <svg {...s}><path d="M3 3v18h18"/><path d="M8 15V9M13 15V5M18 15v-3"/></svg>,
    user:    <svg {...s}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>,
    eye:     <svg {...s}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
    eyeOff:  <svg {...s}><path d="m3 3 18 18"/><path d="M10.58 10.58A2 2 0 0 0 13.42 13.42M9.88 5.08A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-2.16 2.95M6.61 6.61C4.27 8.04 2.84 10.53 2 12c0 0 3.5 7 10 7a9.78 9.78 0 0 0 3.39-.61"/></svg>,
    logout:  <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>,
    copy:    <svg {...s}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    share:   <svg {...s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98m-6.82-7.98 6.82 3.98"/></svg>,
    chevron: <svg {...s}><path d="m9 18 6-6-6-6"/></svg>,
    back:    <svg {...s}><path d="m15 18-6-6 6-6"/></svg>,
    check:   <svg {...s}><path d="M20 6 9 17l-5-5"/></svg>,
    search:  <svg {...s}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    x:       <svg {...s}><path d="M18 6 6 18M6 6l12 12"/></svg>,
    plus:    <svg {...s}><path d="M12 5v14M5 12h14"/></svg>,
    zap:     <svg {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    info:    <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
    shield:  <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>,
    bell:    <svg {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    wallet:  <svg {...s}><path d="M20 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M16 13h2M18 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4"/></svg>,
    filter:  <svg {...s}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    arrowUp: <svg {...s}><path d="M7 7l10 10M7 17V7h10"/></svg>,
    arrowDn: <svg {...s}><path d="M17 7 7 17M7 7h10v10"/></svg>,
    trending:<svg {...s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    receipt: <svg {...s}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8M16 12H8M12 16H8"/></svg>,
    calendar:<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    badge:   <svg {...s}><path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    help:    <svg {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
    chDown:  <svg {...s}><path d="m6 9 6 6 6-6"/></svg>,
    chUp:    <svg {...s}><path d="m18 15-6-6-6 6"/></svg>,
    chLeft:  <svg {...s}><path d="m15 18-6-6 6-6"/></svg>,
    chRight: <svg {...s}><path d="m9 18 6-6-6-6"/></svg>,
    dollar:  <svg {...s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    lock:    <svg {...s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  };
  return icons[name] || icons.zap;
}

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
      <path d="M16 13h2M18 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4"/>
    </svg>
  );
}

/* ── Session helpers ── */
function loadSession() { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):null; } catch{ return null; } }
function saveSession(s) { if(!s){ localStorage.removeItem(STORAGE_KEY); return; } localStorage.setItem(STORAGE_KEY,JSON.stringify(s)); }

function parseRoute() {
  return { path: window.location.pathname==="/"?DEFAULT_REDIRECT:window.location.pathname, search: new URLSearchParams(window.location.search) };
}

async function apiRequest(path, { method="GET", body, token }={}) {
  const headers = { "Content-Type":"application/json" };
  if (token) headers.Authorization = token.startsWith("Bearer ")?token:`Bearer ${token}`;
  const res = await fetch(path, { method, headers, body: body?JSON.stringify(body):undefined });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) { const e=new Error(data.error||data.message||"Something went wrong"); e.status=res.status; e.payload=data; throw e; }
  return data;
}

const fmt = (v, compact=false) => new Intl.NumberFormat("en-NP",{style:"currency",currency:"NPR",notation:compact?"compact":"standard",maximumFractionDigits:0}).format(Number(v||0));
const fmtNum = (v) => new Intl.NumberFormat("en-NP",{maximumFractionDigits:0}).format(Number(v||0));
const fmtShort = (v) => new Intl.DateTimeFormat("en-NP",{month:"short",day:"numeric"}).format(new Date(v));
const fmtLong  = (v) => new Intl.DateTimeFormat("en-NP",{month:"long",day:"numeric",year:"numeric"}).format(new Date(v));
const fmtTime  = (v) => new Intl.DateTimeFormat("en-NP",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(v));
const fmtInr   = (v) => new Intl.NumberFormat("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));
const initials = (v) => v?v.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase():"NP";
const calcFee  = (amt) => Math.min(Math.max(Math.round(Number(amt||0)*0.001),10),1000);

function groupByDay(txs) {
  return txs.reduce((g,tx)=>{
    const k=new Date(tx.created_at).toISOString().slice(0,10);
    g[k]=g[k]||[];g[k].push(tx);return g;
  },{});
}

function getDateRange(filter, custom) {
  const now=new Date(),s=new Date(now),e=new Date(now);
  if (filter==="thisMonth"){ s.setDate(1); }
  else if (filter==="lastMonth"){ s.setMonth(s.getMonth()-1,1); e.setDate(0); }
  else if (filter==="thisYear"){ s.setMonth(0,1); }
  else if (filter==="custom"&&custom.start&&custom.end){ return {start:new Date(custom.start+"T00:00:00"),end:new Date(custom.end+"T23:59:59.999")}; }
  else { return null; }
  s.setHours(0,0,0,0); e.setHours(23,59,59,999);
  return {start:s,end:e};
}

function redirectToLogin(pathname) {
  const r=encodeURIComponent(pathname);
  window.history.replaceState({},"",`/login?redirect=${r}`);
  return parseRoute();
}

function useToasts() {
  const {useState}=React;
  const [toasts,setToasts]=useState([]);
  function push(type,msg){
    const id=`${Date.now()}-${Math.random()}`;
    setToasts(c=>[...c,{id,type,msg}]);
    window.setTimeout(()=>setToasts(c=>c.filter(t=>t.id!==id)),3200);
  }
  return {toasts,push};
}

function ToastStack({toasts}){
  return <div className="toast-stack">{toasts.map(t=><div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}</div>;
}

async function copyText(val,push,label="Copied"){
  try{ await navigator.clipboard.writeText(val); push("success",label); }
  catch{ push("error","Clipboard blocked"); }
}

async function shareLink(link,push){
  if (navigator.share){ try{ await navigator.share({title:"NepPay",text:"Pay with NepPay",url:link}); return; } catch(e){ if(e?.name==="AbortError")return; } }
  copyText(link,push,"Payment link copied");
}

/* ── Charts (using Recharts from CDN) ── */
function BarChartPanel({data}){
  if (!window.Recharts) return <div className="text-muted text-sm" style={{textAlign:"center",padding:"2rem"}}>Chart unavailable</div>;
  const {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,Tooltip}=window.Recharts;
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{background:"#1C1535",border:"1px solid rgba(139,92,246,0.3)",borderRadius:"0.75rem",padding:"0.625rem 0.875rem",fontSize:"0.78rem"}}>
      <p style={{color:"#9B91CC",marginBottom:"0.25rem"}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color,fontWeight:600}}>{p.name}: रू {fmtInr(p.value)}</p>)}
    </div>;
  };
  return <ResponsiveContainer width="100%" height={200}>
    <BarChart data={data} barSize={18} barGap={2}>
      <XAxis dataKey="label" tick={{fill:"#9B91CC",fontSize:10}} axisLine={false} tickLine={false}/>
      <YAxis tick={{fill:"#9B91CC",fontSize:10}} axisLine={false} tickLine={false} width={40}
        tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}K`:v}/>
      <Tooltip content={<TT/>}/>
      <Bar dataKey="received" name="Received" fill="#10B981" radius={[3,3,0,0]} fillOpacity={0.85}/>
      <Bar dataKey="sent"     name="Sent"     fill="#8B5CF6" radius={[3,3,0,0]} fillOpacity={0.85}/>
    </BarChart>
  </ResponsiveContainer>;
}

function PieChartPanel({data}){
  if (!window.Recharts) return null;
  const {ResponsiveContainer,PieChart,Pie,Cell,Tooltip}=window.Recharts;
  return <ResponsiveContainer width="100%" height={180}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
        {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
      </Pie>
      <Tooltip formatter={(v)=>[`रू ${fmtInr(v)}`,"Amount"]} contentStyle={{background:"#1C1535",border:"1px solid rgba(139,92,246,0.3)",borderRadius:"0.75rem",fontSize:"0.78rem"}}/>
    </PieChart>
  </ResponsiveContainer>;
}

window.NepPayCore = {
  STORAGE_KEY,APP_NAME,DEFAULT_REDIRECT,NAV_ITEMS,QUICK_AMOUNTS,
  Icon,WalletIcon,
  loadSession,saveSession,parseRoute,apiRequest,redirectToLogin,
  fmt,fmtNum,fmtShort,fmtLong,fmtTime,fmtInr,initials,calcFee,
  groupByDay,getDateRange,
  useToasts,ToastStack,copyText,shareLink,
  BarChartPanel,PieChartPanel,
};
})();
