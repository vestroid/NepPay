(() => {
const {QUICK_AMOUNTS,Icon,apiRequest,fmt,fmtNum,fmtInr,calcFee,initials,EmptyState} = window.NepPayCore;
const {TransactionList} = window.NepPayWalletLayout;

const TODAY = new Date();
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const NOTE_SUGGESTIONS = [
  "Happy Birthday!",
  "Dinner",
  "Movie tickets",
  "Concert",
  "Rent",
  "Utilities",
  "Groceries",
  "Taxi",
  "Education", 
  "Donation",
  "Gym",
  "Travelling",
  "Household supplies",
  "Online subscription",
  "Digital Services"
];

function DashboardPage({session,balanceVisible,setBalanceVisible,navigate,pushToast}){
  const {useEffect,useState}=React;
  const [user,setUser]=useState(session?.user||null);
  const [stats,setStats]=useState(null);
  const [txs,setTxs]=useState([]);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const [u,s,t]=await Promise.all([
        apiRequest("/api/user",{token:session.token}),
        apiRequest("/api/stats?period=monthly&last=1",{token:session.token}),
        apiRequest("/api/transactions?limit=5&offset=0&type=all&period=all",{token:session.token}),
      ]);
      setUser(u); setStats(s); setTxs(t.data||[]);
    }catch(e){pushToast("error",e.message);}
    finally{setLoading(false);}
  }

  useEffect(()=>{ load(); const id=setInterval(load,30000); return()=>clearInterval(id); },[]);

  const daily=stats?.dailyLimit||{};
  const txnUsed=daily.txnUsed||0;
  const txnLimit=daily.txnLimit||5;
  const amtUsed=Number(daily.amountUsed||0);
  const amtLimit=Number(daily.amountLimit||50000);
  const feeActive=Boolean(daily.feeActive);
  const txPct=Math.min((txnUsed/txnLimit)*100,100);
  const amtPct=Math.min((amtUsed/amtLimit)*100,100);
  const txLeft=Math.max(txnLimit-txnUsed,0);

  const monthTxs=txs.filter(t=>{
    const d=new Date(t.created_at);
    return d.getMonth()===TODAY.getMonth()&&d.getFullYear()===TODAY.getFullYear();
  });
  const monthIn=monthTxs.filter(t=>t.type==="receive").reduce((s,t)=>s+Number(t.amount),0);
  const monthOut=monthTxs.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.amount||0)+Number(t.fee||0),0);

  const hour=TODAY.getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  function QuotaCard(){
    return (
      <div className="quota-card">
        <div className="quota-header">
          <div className="quota-title"><Icon name="zap" size={14}/>Free Daily Quota</div>
          <button className="quota-link" onClick={()=>navigate("/settings")}>Fee info</button>
        </div>
        <div className="quota-row">
          <div className="quota-row-head">
            <span className="quota-row-label">Transactions used</span>
            <span className="quota-row-val" style={{color:txPct>=100?"#EF4444":"#A78BFA"}}>{txnUsed}/{txnLimit}</span>
          </div>
          <div className="quota-bar"><div style={{width:`${txPct}%`}} className={`quota-fill ${txPct>=100?"quota-fill-danger":txPct>=80?"quota-fill-warn":"quota-fill-ok"}`}/></div>
        </div>
        <div className="quota-row" style={{marginBottom:0}}>
          <div className="quota-row-head">
            <span className="quota-row-label">Amount transferred</span>
            <span className="quota-row-val" style={{color:amtPct>=100?"#EF4444":"#A78BFA"}}>
              {balanceVisible?`रू ${fmtInr(amtUsed)} / रू 50,000`:"•••• / ••••"}
            </span>
          </div>
          <div className="quota-bar"><div style={{width:`${amtPct}%`}} className={`quota-fill ${amtPct>=100?"quota-fill-danger":amtPct>=80?"quota-fill-warn":"quota-fill-ok"}`}/></div>
        </div>
        <div className="quota-footer">
          {feeActive?(
            <div className="quota-footer-warn">
              <Icon name="info" size={13}/>
              <span>Daily limit reached. Fees apply (0.1%, min रू 10, max रू 1,000).</span>
            </div>
          ):(
            <p className="quota-footer-ok">✓ {txLeft} free transaction{txLeft!==1?"s":""} left today</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="dash-greeting" style={{display:"flex",alignItems:"center",justifyContent:"space-between", width: "100%", boxSizing: "border-box"}}>
        <div>
          <div className="dash-greeting-date">{DAY_NAMES[TODAY.getDay()]}, {MONTH_NAMES[TODAY.getMonth()]} {TODAY.getDate()}</div>
          <div className="dash-greeting-name">{greeting}, {user?.name?.split(" ")[0]||"there"} 👋</div>
        </div>
        <div className="dash-header-actions">
          <button className="notif-btn"><Icon name="bell" size={16}/><span className="notif-dot"/></button>
          <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)} style={{color:"var(--muted)",padding:"0.375rem",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",background:"var(--card)"}}>
            <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
          </button>
          <button className="user-avatar-btn" onClick={()=>navigate("/settings")}>{initials(user?.name)}</button>
        </div>
      </div>

      <div className="page-inner wide" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="dash-grid">
          {/* Left column */}
          <div className="space-y-4">
            <div className="balance-card">
              <div className="balance-card-orb1"/><div className="balance-card-orb2"/>
              <div style={{position:"relative"}}>
                <div className="flex justify-between items-center" style={{marginBottom:"0.25rem"}}>
                  <span className="balance-label">Total Balance</span>
                  <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)}>
                    <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
                  </button>
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:"0.2rem",margin:"0.25rem 0"}}>
                  <span className="balance-rupee">रू</span>
                  <span className="balance-amount">{balanceVisible?fmtInr(user?.balance||0):"••••••"}</span>
                </div>
                <div className="balance-wallet-id">Wallet ID: {user?.id||"—"}</div>
                <div className="balance-chips">
                  {balanceVisible?(
                    <>
                      <div className="balance-chip balance-chip-in">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                        +रू {fmtInr(monthIn)}
                      </div>
                      <div className="balance-chip balance-chip-out">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                        -रू {fmtInr(monthOut)}
                      </div>
                    </>
                  ):(
                    <div className="balance-chip" style={{background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.7)"}}>Balance hidden</div>
                  )}
                  <span className="balance-chip-date">{MONTH_NAMES[TODAY.getMonth()]} {TODAY.getFullYear()}</span>
                </div>
              </div>
            </div>

            {/* Quota – mobile only */}
            <div className="hide-desktop"><QuotaCard/></div>

            <div>
              <div className="quick-actions">
                {[
                  {icon:"send",label:"Send",to:"/send",color:"#8B5CF6",bg:"rgba(139,92,246,0.15)"},
                  {icon:"arrowDn",label:"Receive",to:"/receive",color:"#10B981",bg:"rgba(16,185,129,0.15)"},
                  {icon:"qr",label:"QR Pay",to:"/receive",color:"#3B82F6",bg:"rgba(59,130,246,0.15)"},
                  {icon:"share",label:"Pay Link",to:"/receive",color:"#F59E0B",bg:"rgba(245,158,11,0.15)"},
                ].map(({icon,label,to,color,bg})=>(
                  <button key={label} className="qa-btn" onClick={()=>navigate(to)}>
                    <div className="qa-icon" style={{background:bg}}><Icon name={icon} size={17} style={{color}}/></div>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="section-head">
                <div className="section-title">Recent Transactions</div>
                <button className="section-link" onClick={()=>navigate("/statements")}>
                  View all <Icon name="chRight" size={13}/>
                </button>
              </div>
              {loading?(
                <p className="text-muted text-sm" style={{textAlign:"center",padding:"1.5rem"}}>Loading transactions…</p>
              ):txs.length?(
                <TransactionList transactions={txs} balanceVisible={balanceVisible} compact/>
              ):(
                <div className="empty-state">
                  <div className="empty-icon"><Icon name="list" size={24}/></div>
                  <p className="empty-text">No transactions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column – desktop */}
          <div className="space-y-4 hide-mobile">
            <QuotaCard/>
            <div className="card">
              <div className="card-body space-y-3">
                <div style={{fontWeight:600,fontSize:"0.85rem"}}>This Month</div>
                {[["Total In",`+रू ${fmtInr(monthIn)}`,"var(--success-text)"],["Total Out",`-रू ${fmtInr(monthOut)}`,"var(--danger-text)"],["Net",`${(monthIn-monthOut)>=0?"+":"-"}रू ${fmtInr(Math.abs(monthIn-monthOut))}`,(monthIn-monthOut)>=0?"var(--success-text)":"var(--danger-text)"]].map(([l,v,c])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.375rem 0",borderBottom:"1px solid var(--border)"}}>
                    <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{l}</span>
                    <span style={{fontWeight:600,fontSize:"0.82rem",color:c}}>{balanceVisible?v:"••••"}</span>
                  </div>
                ))}
                <button className="btn btn-secondary btn-sm btn-w" style={{marginTop:"0.25rem"}} onClick={()=>navigate("/statistics")}>
                  View Reports <Icon name="chRight" size={13}/>
                </button>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div style={{fontWeight:600,fontSize:"0.85rem",marginBottom:"0.75rem"}}>Quick Send</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {QUICK_AMOUNTS.map(a=>(
                    <button key={a} className="qs-btn" style={{width:"100%",justifyContent:"center"}} onClick={()=>navigate(`/send?amount=${a}`)}>
                      रू {a.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Send Page ── */
function SendPage({session,route,navigate,pushToast,balanceVisible,setBalanceVisible}){
  const {useDeferredValue,useEffect,useState}=React;
  const [contacts,setContacts]=useState([]);
  const [search,setSearch]=useState(route.search.get("target")||"");
  const [selected,setSelected]=useState(null);
  const [lookupRes,setLookupRes]=useState(null);
  const [lookupLoading,setLookupLoading]=useState(false);
  const [amount,setAmount]=useState(route.search.get("amount")||"");
  const [amountVisible,setAmountVisible]=useState(true);
  const [pin,setPin]=useState("");
  const [note,setNote]=useState("");
  const [stats,setStats]=useState(null);
  const [step,setStep]=useState(route.search.get("target")?2:1);
  const [submitting,setSubmitting]=useState(false);
  const [success,setSuccess]=useState(null);
  const dSearch=useDeferredValue(search);

  useEffect(()=>{
    Promise.all([
      apiRequest("/api/contacts",{token:session.token}),
      apiRequest("/api/stats?period=monthly&last=1",{token:session.token}),
    ]).then(([c,s])=>{setContacts(c.data||[]);setStats(s);}).catch(e=>pushToast("error",e.message));
  },[]);

  useEffect(()=>{ const t=route.search.get("target"); if(t)lookup(t,true); },[]);

  const filtered=contacts.filter(c=>{
    const n=dSearch.trim().toLowerCase();
    return !n||`${c.id}`.toLowerCase().includes(n);
  });

  const numAmt=parseFloat(amount)||0;
  const daily=stats?.dailyLimit||{};
  // FREE if user hasn't already exceeded today's limit (regardless of how much they're sending now)
  const shouldFee=Boolean(daily.feeActive)||Number(daily.amountUsed||0)>=50000||Number(daily.txnUsed||0)>=5;
  const feeAmt=shouldFee&&numAmt>0?calcFee(numAmt):0;
  const isFree=numAmt>0&&!shouldFee;

  async function lookup(id,auto=false){
    if(!id)return;
    setLookupLoading(true);
    try{
      const d=await apiRequest(`/api/user/public/${encodeURIComponent(id)}`);
      setLookupRes(d);
      if(auto){setSelected(d);setStep(2);}
    }catch(e){pushToast("error",e.message);setLookupRes(null);}
    finally{setLookupLoading(false);}
  }

  async function addContact(id){
    try{
      await apiRequest(`/api/contacts/${encodeURIComponent(id)}`,{method:"POST",token:session.token});
      const r=await apiRequest("/api/contacts",{token:session.token});
      setContacts(r.data||[]);
      pushToast("success","Contact saved");
    }catch(e){pushToast("error",e.message);}
  }

  async function submit(e){
    e.preventDefault();
    if(!selected){pushToast("error","Choose a recipient first");setStep(1);return;}
    setSubmitting(true);
    try{
      const d=await apiRequest("/api/transactions/send",{method:"POST",token:session.token,body:{receiver:selected.id,amount:numAmt,pin,note}});
      setSuccess(d); setPin(""); setStep(3);
      pushToast("success",d.message||"Transfer complete");
    }catch(e){pushToast("error",e.message);}
    finally{setSubmitting(false);}
  }

  const STEPS=["select","amount","confirm"];
  const stepIdx=step-1;

  if(success&&step===3){
    return(
      <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <button className="page-header-back" onClick={()=>navigate("/dashboard")}><Icon name="back" size={16}/></button>
          <div><div className="page-header-title">Send Money</div></div>
        </div>
        <div className="page-inner" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",paddingTop:"2rem"}}>
          <div className="success-icon"><Icon name="check" size={40}/></div>
          <h2 style={{fontWeight:700,fontSize:"1.3rem",marginBottom:"0.25rem"}}>Money Sent!</h2>
          <p className="text-muted text-sm" style={{marginBottom:"1.5rem"}}>Your transaction was successful</p>
          <div className="card w-full" style={{textAlign:"left",marginBottom:"1.5rem"}}>
            <div className="card-body space-y-3">
              {[["To",selected?.id],["Amount",`रू ${fmtInr(numAmt)}`],["Fee",success.fee===0?"FREE ✓":`रू ${fmtInr(success.fee)}`],["Total deducted",`रू ${fmtInr(numAmt+(success.fee||0))}`],["Transaction ID",success.transactionId||"—"]].map(([l,v])=>(
                <div key={l} className="flex justify-between items-center">
                  <span className="text-sm text-muted">{l}</span>
                  <span style={{fontSize:"0.85rem",fontWeight:500,fontFamily:l==="Transaction ID"?"monospace":"inherit"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.75rem",width:"100%"}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={()=>navigate("/")}>Back to Home</button>
            <button className="btn btn-secondary" style={{flex:1}} onClick={()=>{setSuccess(null);setAmount("");setNote("");setSelected(null);setStep(1);}}>Send Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <button className="page-header-back" onClick={()=>step===1?navigate("/dashboard"):setStep(s=>s-1)}><Icon name="back" size={16}/></button>
        <div style={{flex:1, minWidth:0}}>
          <div className="page-header-title">Send Money</div>
          <div className="page-header-sub" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
            {step===1?"Find recipient":step===2?`To: ${selected?.name || selected?.id}`:"Confirm transaction"}
          </div>
        </div>
        <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)} style={{color:"var(--muted)",padding:"0.375rem",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",background:"var(--card)",marginRight:"0.5rem"}}>
          <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
        </button>
        <div className="step-dots">
          {STEPS.map((_,i)=>(
            <div key={i} className={`step-dot ${stepIdx>=i?"step-dot-done":"step-dot-pending"}`}
              style={{width:stepIdx===i?"24px":"8px"}}/>
          ))}
        </div>
      </div>

      <div className="page-inner space-y-3" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {step===1&&(
          <>
            <div className="field field-search" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Icon name="search" size={14} style={{ position: "absolute", left: "0.75rem", color: "var(--muted)" }}/>
              <input className="field-input" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Username or Wallet ID"
                style={{ width: "100%", boxSizing: "border-box", paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
                onKeyDown={e=>e.key==="Enter"&&lookup(search)}/>
              {search&&(
                <button 
                  type="button"
                  style={{ position: "absolute", right: "0.5rem", background: "rgba(139,92,246,0.1)", border: "none", color: "var(--primary)", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }} 
                  onClick={()=>setSearch("")}
                >
                  <Icon name="x" size={12}/>
                </button>
              )}
            </div>

            {lookupRes&&(
              <div className="contact-item" style={{cursor:"default"}}>
                <div className="contact-avatar" style={{background:"rgba(139,92,246,0.2)",color:"#A78BFA"}}>{initials(lookupRes.name)}</div>
                <div style={{flex:1,minWidth:0, overflow:"hidden"}}>
                  <div className="contact-name" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{lookupRes.name || lookupRes.id}</div>
                  <div className="contact-sub" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>Wallet ID: {lookupRes.id}</div>
                </div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <button className="btn btn-primary btn-sm" onClick={()=>{setSelected(lookupRes);setStep(2);}}>Send</button>
                  <button className="btn btn-secondary btn-sm" onClick={()=>addContact(search)}><Icon name="plus" size={14}/></button>
                </div>
              </div>
            )}

            {!search&&<p className="text-xs text-muted">Recent Contacts</p>}
            {search&&!lookupRes&&<p className="text-xs text-muted">Results for "{search}"</p>}

            {filtered.length?(
              <div className="space-y-3">
                {filtered.map(c=>(
                  <button key={c.id} className="contact-item w-full" onClick={()=>{setSelected(c);setStep(2);}}>
                    <div className="contact-avatar" style={{background:"rgba(139,92,246,0.2)",color:"#A78BFA"}}>{initials(c.name)}</div>
                    <div className="contact-copy" style={{flex:1,minWidth:0,textAlign:"left", overflow:"hidden"}}>
                      <div className="contact-name" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{c.name || c.id}</div>
                      <div className="contact-sub" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>Wallet ID: {c.id}</div>
                    </div>
                    <div className="contact-chevron"><Icon name="chRight" size={14}/></div>
                  </button>
                ))}
              </div>
            ):(
              <div className="empty-state" style={{paddingTop:"1.5rem"}}>
                <div className="empty-icon"><Icon name="user" size={20}/></div>
                <p className="empty-text">No contacts yet. Try a direct lookup.</p>
              </div>
            )}

            <button className="btn btn-secondary btn-w btn-sm" onClick={()=>lookup(search)} disabled={!search||lookupLoading}>
              {lookupLoading?"Looking up…":"Lookup by ID / username"}
            </button>
          </>
        )}

        {step===2&&selected&&(
          <>
            <div className="contact-item" style={{cursor:"default"}}>
              <div className="contact-avatar" style={{background:"rgba(139,92,246,0.2)",color:"#A78BFA"}}>{initials(selected.name)}</div>
              <div style={{flex:1,minWidth:0, overflow:"hidden"}}>
                <div className="contact-name" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{selected.name || selected.id}</div>
                <div className="contact-sub" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>Wallet ID: {selected.id}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setStep(1)}>Change</button>
            </div>

            <div className="card">
              <div className="card-body">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                  <label className="field-label">Enter Amount</label>
                  <button style={{color:"var(--muted)",padding:"0.2rem",borderRadius:"var(--r-lg)",display:"flex",alignItems:"center"}} onClick={()=>setAmountVisible(v=>!v)}>
                    <Icon name={amountVisible?"eye":"eyeOff"} size={14}/>
                  </button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
                  <span style={{fontSize:"1.5rem",fontWeight:700,color:"var(--primary)"}}>रू</span>
                  {amountVisible?(
                    <input className="field-input-lg" type="number" value={amount}
                      onChange={e=>setAmount(e.target.value)} placeholder="0" min="1"/>
                  ):(
                    <div style={{flex:1,fontSize:"2rem",fontWeight:700,color:"var(--muted)",letterSpacing:"0.25em",paddingBottom:"0.25rem",borderBottom:"1px solid var(--border)"}}>
                      ••••••
                    </div>
                  )}
                </div>
                {amountVisible&&(
                  <div className="quick-send-row">
                    {QUICK_AMOUNTS.map(a=>(
                      <button key={a} className={`qs-btn${amount===String(a)?" active":""}`} onClick={()=>setAmount(String(a))}>
                        रू {a.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="field" style={{ maxWidth: "100%", boxSizing: "border-box", overflow: "hidden" }}>
              <label className="field-label">Note (optional)</label>
              <input className="field-input" value={note} onChange={e=>setNote(e.target.value)} placeholder="What's this for?" style={{ width: "100%", boxSizing: "border-box" }}/>
              {/* <div style={{ maxWidth: "100%", boxSizing: "border-box", display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem", marginTop: "0.75rem", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                {NOTE_SUGGESTIONS.map(s => (
                  <button 
                    key={s} 
                    type="button" 
                    onClick={() => setNote(s)} 
                    style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "0.375rem 0.75rem", borderRadius: "1rem", background: note === s ? "var(--primary)" : "var(--card-2)", color: note === s ? "#fff" : "var(--text)", border: `1px solid ${note === s ? "var(--primary)" : "var(--border)"}`, fontSize: "0.75rem", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {s}
                  </button>
                ))}
              </div> */}
            </div>

            {numAmt>0&&(
              <div className={`fee-banner ${isFree?"fee-banner-free":"fee-banner-charged"}`}>
                <Icon name={isFree?"zap":"info"} size={14}/>
                <div>
                  <div className="fee-title">{isFree?"This transaction is FREE":`Fee: रू ${fmtInr(feeAmt)}`}</div>
                  <div className="fee-sub">{isFree?"Inside your daily free quota":"0.1% · min रू 10 · max रू 1,000"}</div>
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-w" onClick={()=>setStep(3)} disabled={numAmt<=0}>Continue</button>
          </>
        )}

        {step===3&&selected&&!success&&(
          <form onSubmit={submit} className="space-y-3">
            <div className="card">
              <div className="card-body space-y-3">
                <div style={{fontWeight:600,marginBottom:"0.25rem"}}>Confirm Transaction</div>
                {[["To",selected.name||selected.id],["Wallet ID",selected.id,true],["Amount",balanceVisible?`रू ${fmtInr(numAmt)}`:"••••"],["Transaction fee",isFree?"FREE":(balanceVisible?`रू ${fmtInr(feeAmt)}`:"••••")],["Total debit",balanceVisible?`रू ${fmtInr(numAmt+feeAmt)}`:"••••",false,true]].map(([l,v,sm,bold])=>(
                  <div key={l} className="confirm-row">
                    <span className={`confirm-row-label${sm?" text-xs":""}`}>{l}</span>
                    <span className={`confirm-row-val${sm?" sm":""}${bold?" bold":""}`} style={l==="Transaction fee"&&isFree?{color:"var(--success-text)"}:{}}>{v}</span>
                  </div>
                ))}
                {note&&<div className="confirm-row"><span className="confirm-row-label">Note</span><span className="confirm-row-val">{note}</span></div>}
              </div>
            </div>

            <div className={`fee-banner ${isFree?"fee-banner-free":"fee-banner-charged"}`}>
              <Icon name={isFree?"check":"info"} size={14}/>
              <span style={{fontWeight:500}}>{isFree?"No fee — inside free daily quota":"Fee applies — daily free limit reached"}</span>
            </div>

            <div className="field">
              <label className="field-label">Transfer PIN</label>
              <input className="field-input" type="password" required value={pin}
                onChange={e=>setPin(e.target.value)} inputMode="numeric" placeholder="Your 4 or 6 digit PIN"/>
            </div>

            <div style={{display:"flex",gap:"0.75rem"}}>
              <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(2)}>Edit</button>
              <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={submitting}>
                {submitting?"Sending…":"Confirm & Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

window.NepPayWalletPagesA = { DashboardPage, SendPage };
})();



