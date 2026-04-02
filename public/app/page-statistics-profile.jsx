(() => {
const {Icon,apiRequest,fmt,fmtNum,fmtInr,fmtShort,initials,BarChartPanel,PieChartPanel,copyText} = window.NepPayCore;

const PIE_COLORS=["#8B5CF6","#10B981","#F59E0B","#EF4444","#3B82F6","#EC4899"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ── Statistics / Reports ── */
function StatisticsPage({session,pushToast,balanceVisible,setBalanceVisible}){
  const {useEffect,useMemo,useState}=React;
  const [mode,setMode]=useState("monthly");
  const [month,setMonth]=useState(new Date().getMonth());
  const [year,setYear]=useState(new Date().getFullYear());
  const [allTxs,setAllTxs]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const first=await apiRequest("/api/transactions?limit=200&offset=0&type=all&period=all",{token:session.token});
        let all=first.data||[];
        const total=Number(first.total||all.length);
        for(let o=200;o<Math.min(total,1000);o+=200){
          const pg=await apiRequest(`/api/transactions?limit=200&offset=${o}&type=all&period=all`,{token:session.token});
          all=all.concat(pg.data||[]);
        }
        setAllTxs(all);
      }catch(e){pushToast("error",e.message);}
      finally{setLoading(false);}
    })();
  },[]);

  function prev(){
    if(mode==="monthly"){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
    else setYear(y=>y-1);
  }
  function next(){
    if(mode==="monthly"){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
    else setYear(y=>y+1);
  }

  const relevantTxs=useMemo(()=>allTxs.filter(tx=>{
    const d=new Date(tx.created_at);
    if(mode==="monthly") return d.getMonth()===month&&d.getFullYear()===year;
    return d.getFullYear()===year;
  }),[allTxs,mode,month,year]);

  const stats=useMemo(()=>{
    const sent=relevantTxs.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.amount||0),0);
    const recv=relevantTxs.filter(t=>t.type==="receive").reduce((s,t)=>s+Number(t.amount||0),0);
    const fees=relevantTxs.filter(t=>t.type==="send").reduce((s,t)=>s+Number(t.fee||0),0);
    const free=relevantTxs.filter(t=>t.type==="send"&&t.isFree).length;
    return {sent,recv,fees,free,count:relevantTxs.length};
  },[relevantTxs]);

  const chartData=useMemo(()=>{
    if(mode==="monthly"){
      const daysInMonth=new Date(year,month+1,0).getDate();
      const data=Array.from({length:daysInMonth},(_,i)=>({label:String(i+1),sent:0,received:0}));
      relevantTxs.forEach(tx=>{
        const d=new Date(tx.created_at);
        const i=d.getDate()-1;
        if(tx.type==="send") data[i].sent+=Number(tx.amount||0);
        else data[i].received+=Number(tx.amount||0);
      });
      return data;
    }
    return MONTHS.map((m,mi)=>{
      const s=allTxs.filter(t=>new Date(t.created_at).getMonth()===mi&&new Date(t.created_at).getFullYear()===year&&t.type==="send").reduce((a,t)=>a+Number(t.amount||0),0);
      const r=allTxs.filter(t=>new Date(t.created_at).getMonth()===mi&&new Date(t.created_at).getFullYear()===year&&t.type==="receive").reduce((a,t)=>a+Number(t.amount||0),0);
      return {label:m,sent:s,received:r};
    });
  },[relevantTxs,allTxs,mode,month,year]);

  const catData=useMemo(()=>{
    const map=new Map();
    relevantTxs.filter(t=>t.type==="send").forEach(t=>{
      const c=t.category||t.note||"Other";
      map.set(c,(map.get(c)||0)+Number(t.amount||0));
    });
    return Array.from(map.entries()).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,6);
  },[relevantTxs]);

  const pieData=catData.map((d,i)=>({...d,color:PIE_COLORS[i%PIE_COLORS.length]}));

  const topTxs=useMemo(()=>[...relevantTxs].sort((a,b)=>Number(b.amount||0)-Number(a.amount||0)).slice(0,5),[relevantTxs]);

  const periodLabel=mode==="monthly"?`${MONTHS[month]} ${year}`:String(year);

  // Check if there's any data to show
  const hasData=chartData.some(d=>d.sent>0||d.received>0);

  return(
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div style={{flex:1}}>
          <div className="page-header-title">Reports</div>
          <div className="page-header-sub">Financial overview</div>
        </div>
        <button className="balance-toggle" onClick={()=>setBalanceVisible(v=>!v)} style={{color:"var(--muted)",padding:"0.375rem",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",background:"var(--card)"}}>
          <Icon name={balanceVisible?"eye":"eyeOff"} size={15}/>
        </button>
      </div>

      <div className="page-inner wide space-y-3" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* Period controls */}
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div className="tabs-pill">
            <button className={`tab${mode==="monthly"?" active":""}`} onClick={()=>setMode("monthly")}>Monthly</button>
            <button className={`tab${mode==="yearly"?" active":""}`} onClick={()=>setMode("yearly")}>Yearly</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginLeft:"auto"}}>
            <button className="btn btn-secondary btn-sm" style={{padding:"0.375rem"}} onClick={prev}><Icon name="chLeft" size={14}/></button>
            <span style={{fontSize:"0.88rem",fontWeight:600,minWidth:"80px",textAlign:"center"}}>{periodLabel}</span>
            <button className="btn btn-secondary btn-sm" style={{padding:"0.375rem"}} onClick={next}><Icon name="chRight" size={14}/></button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="reports-summary">
          {[
            {label:"Total Received",val:stats.recv,color:"var(--success-text)",icon:"arrowDn"},
            {label:"Total Sent",val:stats.sent,color:"var(--danger-text)",icon:"arrowUp"},
            {label:"Fees Paid",val:stats.fees,color:"var(--warn-text)",icon:"receipt"},
            {label:"Net Change",val:stats.recv-stats.sent-stats.fees,color:(stats.recv-stats.sent-stats.fees)>=0?"var(--success-text)":"var(--danger-text)",icon:"dollar"},
          ].map(({label,val,color,icon})=>(
            <div key={label} className="summary-stat">
              <div className="summary-stat-header">
                <span className="summary-stat-label">{label}</span>
                <div className="summary-stat-icon" style={{background:`${color}22`}}>
                  <Icon name={icon} size={11} style={{color}}/>
                </div>
              </div>
              <div className="summary-stat-val" style={{color}}>
                {balanceVisible?(val<0?"-":"")+"रू "+fmtInr(Math.abs(val)):"••••"}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:"0.75rem"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:"0.5rem",background:"var(--card-2)",border:"1px solid var(--border)",borderRadius:"var(--r-xl)",padding:"0.5rem 0.75rem",fontSize:"0.72rem"}}>
            <span className="text-muted">Transactions:</span>
            <span style={{fontWeight:600}}>{stats.count}</span>
          </div>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:"0.5rem",background:"var(--card-2)",border:"1px solid var(--border)",borderRadius:"var(--r-xl)",padding:"0.5rem 0.75rem",fontSize:"0.72rem"}}>
            <span className="text-muted">Free sends:</span>
            <span style={{fontWeight:600,color:"var(--success-text)"}}>{stats.free}</span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="chart-card-inner">
          <div style={{fontWeight:600,fontSize:"0.88rem",marginBottom:"1rem"}}>{mode==="monthly"?"Daily Activity":"Monthly Activity"}</div>
          {loading?(
            <div style={{height:200,display:"grid",placeItems:"center"}}><p className="text-muted text-sm">Loading…</p></div>
          ):!hasData?(
            <div style={{height:200,display:"grid",placeItems:"center",flexDirection:"column"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📊</div>
                <p className="text-muted text-sm">No transactions in this period</p>
                <p className="text-xs text-muted" style={{marginTop:"0.25rem"}}>Try a different month or make some transactions</p>
              </div>
            </div>
          ):(
            <BarChartPanel data={chartData}/>
          )}
          <div className="chart-legend">
            {[{color:"#10B981",label:"Received"},{color:"#8B5CF6",label:"Sent"}].map(({color,label})=>(
              <div key={label} className="chart-legend-item">
                <div className="chart-legend-dot" style={{background:color}}/>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        {catData.length>0&&(
          <div className="chart-card-inner">
            <div style={{fontWeight:600,fontSize:"0.88rem",marginBottom:"1rem"}}>Spending by Category</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0"}}>
              {catData.length>2&&<PieChartPanel data={pieData}/>}
              <div style={{marginTop:"0.75rem"}}>
                {catData.map((cat,i)=>{
                  const pct=stats.sent>0?(cat.value/stats.sent)*100:0;
                  return(
                    <div key={cat.name} className="category-row">
                      <div className="category-row-head">
                        <div className="category-row-name">
                          <div className="category-row-dot" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                          {cat.name}
                        </div>
                        <span className="text-muted text-xs">{balanceVisible?`रू ${fmtNum(cat.value)}`:"••••"} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="category-bar"><div className="category-fill" style={{width:`${pct}%`,background:PIE_COLORS[i%PIE_COLORS.length]}}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top transactions */}
        {topTxs.length>0&&(
          <div className="chart-card-inner">
            <div style={{fontWeight:600,fontSize:"0.88rem",marginBottom:"0.75rem"}}>Top Transactions</div>
            {topTxs.map(tx=>{
              const isSend=tx.type==="send";
              const name=tx.counterpart?.name||"Unknown";
              return(
                <div key={tx.id} className="top-tx">
                  <div className={`tx-avatar ${isSend?"tx-avatar-send":"tx-avatar-recv"}`}>
                    {isSend?<Icon name="arrowUp" size={14}/>:<Icon name="arrowDn" size={14}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="tx-name">{name}</div>
                    <div className="tx-meta">{fmtShort(tx.created_at)}</div>
                  </div>
                  <div className={`tx-amount ${isSend?"tx-amount-send":"tx-amount-recv"}`}>
                    {balanceVisible?(isSend?"-":"+")+`रू ${fmtNum(tx.amount)}`:"••••"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Profile Page with tabs ── */
function ProfilePage({session,setSession,pushToast,navigate,logout}){
  const {useEffect,useState}=React;
  const [user,setUser]=useState(session?.user||null);
  const [name,setName]=useState(session?.user?.name||"");
  const [saving,setSaving]=useState(false);
  const [copied,setCopied]=useState(null);
  const [stats,setStats]=useState(null);
  const [activeTab,setActiveTab]=useState("account");

  useEffect(()=>{
    Promise.all([
      apiRequest("/api/user",{token:session.token}),
      apiRequest("/api/stats?period=monthly&last=1",{token:session.token}),
    ]).then(([u,s])=>{
      setUser(u);setName(u.name||"");setStats(s);
    }).catch(e=>pushToast("error",e.message));
  },[]);

  async function handleSave(e){
    e.preventDefault();setSaving(true);
    try{
      await apiRequest("/api/user",{method:"PUT",token:session.token,body:{name}});
      setSession({...session,user:{...(session.user||{}),name}});
      pushToast("success","Profile updated");
    }catch(err){pushToast("error",err.message);}
    finally{setSaving(false);}
  }

  function doCopy(val,key,label){
    navigator.clipboard.writeText(val).then(()=>{setCopied(key);setTimeout(()=>setCopied(null),2000);pushToast("success",label);}).catch(()=>pushToast("error","Clipboard blocked"));
  }

  const daily=stats?.dailyLimit||{};
  const txnUsed=daily.txnUsed||0;
  const txnLimit=daily.txnLimit||5;
  const limitReached=txnUsed>=txnLimit||Number(daily.amountUsed||0)>=50000;

  const TABS=[
    {id:"account",label:"Account",icon:"user"},
    {id:"notifications",label:"Notifications",icon:"bell"},
    {id:"security",label:"Security",icon:"shield"},
    {id:"help",label:"Help & Support",icon:"help"},
    {id:"about",label:"About NepPay",icon:"info"},
  ];

  return(
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <div className="page-header" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="page-header-title">Profile</div>
      </div>

      <div className="page-inner space-y-4" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* Profile card */}
        <div className="profile-card">
          <div style={{position:"absolute",top:"-1.5rem",right:"-1.5rem",width:"6rem",height:"6rem",borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <div className="profile-avatar">{initials(user?.name)}</div>
            <div>
              <div className="profile-name-row">
                <span style={{fontWeight:700,fontSize:"1.05rem",color:"#fff"}}>{user?.name||"NepPay User"}</span>
                <Icon name="badge" size={14} style={{color:"#DDD6FE"}}/>
              </div>
              <div style={{fontSize:"0.8rem",color:"#C4B5FD"}}>{user?.username||session?.user?.username||"—"}</div>
              <div style={{fontSize:"0.72rem",color:"#A78BFA",marginTop:"0.1rem"}}>{user?.id||"—"}</div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="profile-tab-nav">
          {TABS.map(t=>(
            <button key={t.id} className={`profile-tab-btn${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>
              <Icon name={t.icon} size={13}/>{t.label}
            </button>
          ))}
        </div>

        {/* Account Settings */}
        {activeTab==="account"&&(
          <>
            <div className="account-section">
              <div className="account-section-header">Account Details</div>
              {[["Username",user?.username||session?.user?.username||"—","uname"],["Email",session?.user?.email||"—","email"],["Wallet ID",user?.id||"—","wid"]].map(([label,val,key])=>(
                <div key={key} className="account-row">
                  <div>
                    <div style={{fontSize:"0.7rem",color:"var(--muted)"}}>{label}</div>
                    <div style={{fontSize:"0.85rem",fontWeight:500}}>{val}</div>
                  </div>
                  <button className="account-row-copy" onClick={()=>doCopy(val,key,`${label} copied`)}>
                    {copied===key?<Icon name="check" size={14}/>:<Icon name="copy" size={14}/>}
                  </button>
                </div>
              ))}
              <div style={{padding:"0.75rem 1rem"}}>
                <form onSubmit={handleSave} style={{display:"flex",gap:"0.5rem"}}>
                  <input className="field-input" style={{flex:1}} value={name} onChange={e=>setName(e.target.value)} placeholder="Update display name"/>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>{saving?"…":"Save"}</button>
                </form>
              </div>
            </div>

            {/* we should probably m ove this to FAQ */}
            {/* <div className="account-section">
              <div className="account-section-header" style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <Icon name="zap" size={14} style={{color:"var(--primary)"}}/>Fee Structure
              </div>
              <div style={{padding:"1rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                <div style={{padding:"0.75rem",borderRadius:"var(--r-xl)",background:limitReached?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${limitReached?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`}}>
                  <p style={{fontSize:"0.75rem",fontWeight:600,color:limitReached?"var(--danger-text)":"var(--success-text)"}}>
                    {limitReached?`Daily limit reached (${txnUsed}/${txnLimit} transactions)`:`${txnLimit-txnUsed} free transaction${txnLimit-txnUsed!==1?"s":""} remaining today`}
                  </p>
                </div>
                {[
                  {e:"🎁",t:"Daily Free Tier",d:"First 5 transactions OR up to रू 50,000 transferred per day are completely free."},
                  {e:"💳",t:"Fee After Limit",d:"0.1% of transaction amount. Minimum: रू 10. Maximum: रू 1,000."},
                  {e:"🔄",t:"Daily Reset",d:"Free quota resets every day at midnight — you always get at least 1 free send daily."},
                ].map(({e,t,d})=>(
                  <div key={t} className="fee-rule">
                    <span className="fee-rule-emoji">{e}</span>
                    <div><div className="fee-rule-title">{t}</div><div className="fee-rule-desc">{d}</div></div>
                  </div>
                ))}
              </div>
            </div> */}

            <div className="account-section">
              <div className="account-section-header">Credentials</div>
              <div className="settings-row" onClick={()=>navigate("/reset")} style={{cursor:"pointer"}}>
                <div className="settings-row-icon"><Icon name="lock" size={14}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.85rem",fontWeight:500}}>Change Password / PIN</div>
                  <div className="text-xs text-muted">Update your login password or transfer PIN</div>
                </div>
                <div className="settings-row-chevron"><Icon name="chRight" size={14}/></div>
              </div>
            </div>
          </>
        )}

        {/* Notifications */}
        {activeTab==="notifications"&&(
          <div className="tab-placeholder">
            <div className="tab-placeholder-icon"><Icon name="bell" size={18}/></div>
            <div style={{fontWeight:600,marginBottom:"0.375rem"}}>Notifications</div>
            <p className="text-sm text-muted">Transaction alerts, promotions, and app updates.</p>
            <p className="text-xs text-muted" style={{marginTop:"0.75rem",color:"var(--primary)"}}>Coming soon</p>
          </div>
        )}

        {/* Security */}
        {activeTab==="security"&&(
          <div className="account-section">
            <div className="account-section-header">Security Settings</div>
            {[
              {icon:"shield",label:"Two-Factor Authentication",desc:"Add an extra layer of login security",badge:"Coming soon"},
              {icon:"lock",label:"Change Transfer PIN",desc:"Update your 4 or 6 digit PIN",action:()=>navigate("/reset")},
              {icon:"lock",label:"Change Password",desc:"Update your account password",action:()=>navigate("/reset")},
            ].map(({icon,label,desc,badge,action})=>(
              <div key={label} className="settings-row" onClick={action} style={{cursor:action?"pointer":"default"}}>
                <div className="settings-row-icon"><Icon name={icon} size={14}/></div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <span style={{fontSize:"0.85rem",fontWeight:500}}>{label}</span>
                    {badge&&<span style={{fontSize:"0.62rem",padding:"0.1rem 0.4rem",borderRadius:"0.375rem",background:"rgba(139,92,246,0.2)",color:"var(--primary)",fontWeight:600}}>{badge}</span>}
                  </div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
                {action&&<div className="settings-row-chevron"><Icon name="chRight" size={14}/></div>}
              </div>
            ))}
          </div>
        )}

        {/* Help & Support */}
        {activeTab==="help"&&(
          <div className="account-section">
            <div className="account-section-header">Help & Support</div>
            {[
              {icon:"help",label:"FAQ",desc:"Answers to common questions"},
              {icon:"share",label:"Contact Support",desc:"Get help from our team"},
              {icon:"receipt",label:"Report an Issue",desc:"Report bugs or problems"},
            ].map(({icon,label,desc})=>(
              <div key={label} className="settings-row" style={{cursor:"pointer"}}>
                <div className="settings-row-icon"><Icon name={icon} size={14}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.85rem",fontWeight:500}}>{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
                <div className="settings-row-chevron"><Icon name="chRight" size={14}/></div>
              </div>
            ))}
            <div style={{padding:"1rem",borderTop:"1px solid var(--border)"}}>
              <p className="text-xs text-muted" style={{textAlign:"center"}}>NepPay Support · support@neppay.com.np</p>
            </div>
          </div>
        )}

        {/* About NepPay */}
        {activeTab==="about"&&(
          <>
            <div className="account-section">
              <div className="account-section-header">About NepPay</div>
              <div style={{padding:"1rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                {[["App Version","1.0.0"],["Platform","Digital Wallet"],["Country","Nepal 🇳🇵"],["Currency","NPR (Nepali Rupee)"]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.375rem 0",borderBottom:"1px solid var(--border)"}}>
                    <span style={{fontSize:"0.78rem",color:"var(--muted)"}}>{l}</span>
                    <span style={{fontSize:"0.82rem",fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="account-section">
              <div className="account-section-header">Legal</div>
              {["Terms of Service","Privacy Policy","Open Source Licenses"].map(item=>(
                <div key={item} className="settings-row" style={{cursor:"pointer"}}>
                  <div className="settings-row-icon"><Icon name="receipt" size={14}/></div>
                  <div style={{flex:1}}><div style={{fontSize:"0.85rem",fontWeight:500}}>{item}</div></div>
                  <div className="settings-row-chevron"><Icon name="chRight" size={14}/></div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted" style={{textAlign:"center"}}>NepPay v1.0.0 · Secure Digital Wallet for Nepal</p>
          </>
        )}

        {/* Sign out button always at bottom */}
        <button className="profile-signout" onClick={logout}>
          <Icon name="logout" size={16}/>Sign Out
        </button>

        <div style={{height:"0.5rem"}}/>
      </div>
    </div>
  );
}

window.NepPayWalletPagesC = { StatisticsPage, ProfilePage };
})();

