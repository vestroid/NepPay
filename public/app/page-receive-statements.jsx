(() => {
const {Icon,apiRequest,fmt,fmtNum,fmtInr,fmtLong,fmtShort,getDateRange,groupByDay,copyText,shareLink} = window.NepPayCore;
const {TransactionList} = window.NepPayWalletLayout;

/* ── Receive ── */
function ReceivePage({session,pushToast,balanceVisible,setBalanceVisible}){
  const {useEffect,useState}=React;
  const [tab,setTab]=useState("qr");
  const [user,setUser]=useState(null);
  const [reqAmt,setReqAmt]=useState("");
  const [payData,setPayData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [showAmt,setShowAmt]=useState(false);
  const [copied,setCopied]=useState(null);

  async function load(amount=""){
    setLoading(true);
    try{
      const [u,p]=await Promise.all([
        apiRequest("/api/user",{token:session.token}),
        apiRequest(`/api/payments/receive${amount?`?amount=${encodeURIComponent(amount)}`:""}`,{token:session.token}),
      ]);
      setUser(u); setPayData(p);
    }catch(e){pushToast("error",e.message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  function doCopy(val,key,label){
    navigator.clipboard.writeText(val).then(()=>{setCopied(key);setTimeout(()=>setCopied(null),2000);pushToast("success",label||"Copied");}).catch(()=>pushToast("error","Clipboard blocked"));
  }

  const numAmt=parseFloat(reqAmt)||0;
  const QUICK=[100,500,1000,2000,5000];

  return(
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div style={{flex:1}}>
          <div className="page-header-title">Receive Money</div>
          <div className="page-header-sub">Share your QR or payment link</div>
        </div>
        <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)} style={{color:"var(--muted)",padding:"0.375rem",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",background:"var(--card)"}}>
          <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
        </button>
      </div>

      <div className="page-inner space-y-3" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="tabs-pill tabs-pill-full">
          <button className={`tab${tab==="qr"?" active":""}`} onClick={()=>setTab("qr")}>
            <Icon name="qr" size={13}/>QR Code
          </button>
          <button className={`tab${tab==="link"?" active":""}`} onClick={()=>setTab("link")}>
            <Icon name="share" size={13}/>Payment Link
          </button>
        </div>

        {/* Amount request collapsible */}
        <div className="amount-collapsible">
          <div className="amount-collapsible-head" onClick={()=>setShowAmt(v=>!v)}>
            <span>{numAmt>0?`Request: रू ${numAmt.toLocaleString("en-IN")}`:"Request specific amount (optional)"}</span>
            <Icon name={showAmt?"chUp":"chDown"} size={14}/>
          </div>
          {showAmt&&(
            <div className="amount-collapsible-body space-y-3" style={{paddingTop:"0.75rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <span style={{fontSize:"1.1rem",fontWeight:600,color:"var(--primary)"}}>रू</span>
                <input className="field-input-lg" type="number" value={reqAmt} onChange={e=>setReqAmt(e.target.value)} placeholder="0"/>
              </div>
              <div className="quick-send-row">
                {QUICK.map(a=>(
                  <button key={a} className={`qs-btn${reqAmt===String(a)?" active":""}`} onClick={()=>setReqAmt(String(a))}>
                    रू {a.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button className="btn btn-primary btn-sm" onClick={()=>load(reqAmt)} disabled={loading}>{loading?"Generating…":"Generate"}</button>
                {numAmt>0&&<button className="btn btn-ghost btn-sm" onClick={()=>{setReqAmt("");load("");}}>Clear</button>}
              </div>
            </div>
          )}
        </div>

        {tab==="qr"&&(
          <div className="card">
            <div className="card-body space-y-3" style={{textAlign:"center"}}>
              <div className="receive-user-avatar">{user?.username?user.username.slice(0,2).toUpperCase():"NP"}</div>
              <div style={{fontWeight:600,fontSize:"0.95rem"}}>{user?.name}</div>
              <div className="text-xs text-muted">{user?.id}</div>
              {payData?.qr?(
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div className="qr-wrapper"><img src={payData.qr} alt="QR code"/></div>
                </div>
              ):(
                <div style={{padding:"2rem",color:"var(--muted)",fontSize:"0.85rem"}}>Generate to show QR</div>
              )}
              {numAmt>0&&<div className="amount-pill">रू {numAmt.toLocaleString("en-IN")}</div>}
              <p className="text-xs text-muted">Scan this QR code with NepPay to send money</p>
              {payData&&(
                <div style={{display:"flex",gap:"0.75rem"}}>
                  <button className="btn btn-secondary" style={{flex:1}} onClick={()=>doCopy(payData.link,"qr","Link copied")}>
                    {copied==="qr"?<Icon name="check" size={15}/>:<Icon name="copy" size={15}/>}
                    {copied==="qr"?"Copied!":"Copy"}
                  </button>
                  <button className="btn btn-primary" style={{flex:1}} onClick={()=>shareLink(payData.link,pushToast)}>
                    <Icon name="share" size={15}/>Share
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="link"&&(
          <div className="space-y-3">
            {payData&&(
              <div className="wallet-detail-card">
                <div className="wallet-detail-row">
                  <div><div className="wdr-label">Payment link</div></div>
                  <button className="account-row-copy" onClick={()=>doCopy(payData.link,"link","Link copied")}>{copied==="link"?<Icon name="check" size={14}/>:<Icon name="copy" size={14}/>}</button>
                </div>
                <div style={{padding:"0 1rem 0.875rem"}}>
                  <div className="copy-row">
                    <span className="copy-val">{payData.link}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="wallet-detail-card">
              <div className="wallet-detail-row">
                <div><div className="wdr-label">Wallet ID</div><div className="wdr-val-mono">{user?.id||"—"}</div></div>
                <button className="account-row-copy" onClick={()=>doCopy(user?.id||"","wid","Wallet ID copied")}>{copied==="wid"?<Icon name="check" size={14}/>:<Icon name="copy" size={14}/>}</button>
              </div>
              <div className="wallet-detail-row">
                <div><div className="wdr-label">Username</div><div className="wdr-val">{user?.username||"—"}</div></div>
                <button className="account-row-copy" onClick={()=>doCopy(user?.username||"","un","Username copied")}>{copied==="un"?<Icon name="check" size={14}/>:<Icon name="copy" size={14}/>}</button>
              </div>
            </div>
            {payData&&(
              <button className="btn btn-primary btn-w" onClick={()=>shareLink(payData.link,pushToast)}>
                <Icon name="share" size={15}/>Share Payment Link
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Statements ── */
function StatementsPage({session,pushToast,balanceVisible,setBalanceVisible}){
  const {useEffect,useMemo,useState}=React;
  const [loading,setLoading]=useState(true);
  const [allTxs,setAllTxs]=useState([]);
  const [preset,setPreset]=useState("thisMonth");
  const [type,setType]=useState("all");
  const [customRange,setCustomRange]=useState({start:"",end:""});
  const [showFilters,setShowFilters]=useState(false);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const first=await apiRequest("/api/transactions?limit=100&offset=0&type=all&period=all",{token:session.token});
        let all=first.data||[];
        const total=Number(first.total||all.length);
        for(let o=100;o<total;o+=100){
          const pg=await apiRequest(`/api/transactions?limit=100&offset=${o}&type=all&period=all`,{token:session.token});
          all=all.concat(pg.data||[]);
        }
        setAllTxs(all);
      }catch(e){pushToast("error",e.message);}
      finally{setLoading(false);}
    })();
  },[]);

  const range=useMemo(()=>getDateRange(preset,customRange),[preset,customRange]);

  const filtered=useMemo(()=>{
    return allTxs.filter(tx=>{
      const d=new Date(tx.created_at);
      const inRange=range?d>=range.start&&d<=range.end:true;
      const matchType=type==="all"||tx.type===type;
      return inRange&&matchType;
    });
  },[allTxs,range,type]);

  const totalIn=filtered.filter(t=>t.type==="receive").reduce((s,t)=>s+Number(t.amount||0),0);
  const totalOut=filtered.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.amount||0),0);
  const totalFees=filtered.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.fee||0),0);

  const grouped=useMemo(()=>groupByDay(filtered),[filtered]);
  const days=Object.keys(grouped).sort((a,b)=>new Date(b)-new Date(a));

  const today=new Date().toISOString().slice(0,10);

  const PRESETS=[{k:"thisMonth",l:"This Month"},{k:"lastMonth",l:"Last Month"},{k:"thisYear",l:"This Year"},{k:"custom",l:"Custom"}];

  return(
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", gap: "0.75rem" }}>
        <div style={{flex:1}}>
          <div className="page-header-title">Statements</div>
          <div className="page-header-sub">
            {range?`${fmtShort(range.start)} – ${fmtShort(range.end)}`:"All time"}
          </div>
        </div>
        <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)} style={{color:"var(--muted)",padding:"0.375rem",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",background:"var(--card)"}}>
          <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
        </button>
        <button className={`filter-btn ${showFilters?"filter-chip active":"filter-chip"}`} onClick={()=>setShowFilters(v=>!v)}>
          <Icon name="filter" size={13}/>Filter
        </button>
      </div>

      {showFilters&&(
        <div style={{ width: "100%", boxSizing: "border-box", padding:"0.875rem 1rem", borderBottom:"1px solid var(--border)", background:"var(--bg-elevated)", display:"flex", flexDirection:"column", gap:"0.75rem"}}>
          <div>
            <p className="text-xs text-muted mb-2">Date Range</p>
            <div className="filter-chips">
              {PRESETS.map(p=><button key={p.k} className={`filter-chip${preset===p.k?" active":""}`} onClick={()=>setPreset(p.k)}>{p.l}</button>)}
            </div>
          </div>
          {preset==="custom"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
              <div className="field"><label className="field-label">From</label><input className="field-input" type="date" value={customRange.start} onChange={e=>setCustomRange(p=>({...p,start:e.target.value}))}/></div>
              <div className="field"><label className="field-label">To</label><input className="field-input" type="date" value={customRange.end} onChange={e=>setCustomRange(p=>({...p,end:e.target.value}))}/></div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted mb-2">Type</p>
            <div className="filter-chips">
              {[["all","All"],["send","Sent"],["receive","Received"]].map(([k,l])=><button key={k} className={`filter-chip${type===k?" active":""}`} onClick={()=>setType(k)}>{l}</button>)}
            </div>
          </div>
        </div>
      )}

      <div className="page-inner space-y-4" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* Summary */}
        <div className="statements-summary">
          <div className="stat-mini">
            <div className="stat-mini-label"><Icon name="arrowDn" size={12} style={{color:"var(--success-text)"}}/>Received</div>
            <div className={`stat-mini-val stat-mini-recv`}>{balanceVisible?`रू ${fmtInr(totalIn)}`:"••••"}</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-label"><Icon name="arrowUp" size={12} style={{color:"var(--danger-text)"}}/>Sent</div>
            <div className={`stat-mini-val stat-mini-sent`}>{balanceVisible?`रू ${fmtInr(totalOut)}`:"••••"}</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-label"><Icon name="receipt" size={12} style={{color:"var(--warn-text)"}}/>Fees</div>
            <div className={`stat-mini-val stat-mini-fee`}>{balanceVisible?`रू ${fmtInr(totalFees)}`:"••••"}</div>
          </div>
        </div>

        <p className="tx-count-text">{filtered.length} transaction{filtered.length!==1?"s":""} found</p>

        {loading?(
          <p className="text-muted text-sm" style={{textAlign:"center",padding:"2rem"}}>Loading transactions…</p>
        ):days.length?(
          days.map(day=>{
            const txs=grouped[day];
            const isToday=day===today;
            const daySent=txs.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.amount||0),0);
            const dayRecv=txs.filter(t=>t.type==="receive").reduce((s,t)=>s+Number(t.amount||0),0);
            return(
              <div key={day} className="day-group">
                <div className="day-header">
                  <span className="day-label">{isToday?"Today":fmtLong(day)}</span>
                  <div className="day-divider"/>
                  <span className="day-count">{txs.length} txn{txs.length!==1?"s":""}</span>
                </div>
                <TransactionList transactions={txs} balanceVisible={balanceVisible} compact/>
              </div>
            );
          })
        ):(
          <div className="empty-state">
            <div className="empty-icon"><Icon name="calendar" size={20}/></div>
            <p className="empty-text">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}

window.NepPayWalletPagesB = { ReceivePage, StatementsPage };
})();

