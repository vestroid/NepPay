(() => {
const {APP_NAME,NAV_ITEMS,Icon,WalletIcon,fmt,fmtTime,initials} = window.NepPayCore;

function WalletLayout({children,currentPath,session,navigate,logout,balanceVisible,setBalanceVisible}){
  const firstName = session?.user?.name?.split(" ")[0]||"";
  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><WalletIcon/></div>
          <div>
            <div className="sidebar-logo-name">Nep<span>Pay</span></div>
            <div className="sidebar-logo-sub">Digital Wallet</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item=>{
            const active=currentPath===item.path;
            return (
              <button key={item.path} className={`sidebar-link${active?" active":""}`} onClick={()=>navigate(item.path)}>
                <Icon name={item.icon} size={17}/>
                <span>{item.label}</span>
                {active&&<span className="link-dot"/>}
              </button>
            );
          })}
          <button className="sidebar-link" onClick={logout} style={{marginTop:"auto"}}>
            <Icon name="logout" size={17}/><span>Sign out</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <p>NepPay v1.0 · रू NPR</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {NAV_ITEMS.slice(0,5).map(item=>{
            const active=currentPath===item.path;
            return (
              <button key={item.path} className={`mobile-link${active?" active":""}`} onClick={()=>navigate(item.path)}>
                <div className="ml-icon"><Icon name={item.icon} size={17}/></div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function TransactionList({transactions,balanceVisible=true,compact=false}){
  return (
    <div className="tx-list">
      {transactions.map(tx=>{
        const isSend=tx.type==="send";
        const name=isSend?tx.counterpart?.name||"Unknown":tx.counterpart?.name||"Unknown";
        return (
          <div key={tx.id} className="tx-item">
            <div className={`tx-avatar ${isSend?"tx-avatar-send":"tx-avatar-recv"}`}>
              {isSend?<Icon name="arrowUp" size={14} style={{color:"#F87171"}}/>:<Icon name="arrowDn" size={14} style={{color:"#34D399"}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div className="tx-name">{name}</div>
              <div className="tx-meta">{tx.note?`${tx.note} · `:""}{fmtTime(tx.created_at)}</div>
            </div>
            <div>
              <div className={`tx-amount ${isSend?"tx-amount-send":"tx-amount-recv"}`}>
                {balanceVisible?(isSend?"-":"+")+(fmt(tx.amount)):"••••"}
              </div>
              {!compact&&tx.fee>0&&balanceVisible&&<div className="tx-fee">Fee: {fmt(tx.fee)}</div>}
              {tx.isFree&&isSend&&<div className="tx-free">FREE</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.NepPayWalletLayout = { WalletLayout, TransactionList };
})();
