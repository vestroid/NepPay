(() => {
const {APP_NAME,DEFAULT_REDIRECT,Icon,WalletIcon,apiRequest,redirectToLogin,initials,fmt} = window.NepPayCore;

/* ── Validation Rules ── */
const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,}$/;
const nameRegex = /^[a-zA-Z ]+$/;
const pinRegex = /^\d{4}$|^\d{6}$/;

const validateUsername = (username) => {
    if (!username || username.length < 3 || !usernameRegex.test(username)) {
        return { valid: false, message: "Username must be 3+ chars and contain only letters, numbers, or underscores." };
    }
    return { valid: true };
}

const validateName = (name) => {
    if (!name || name.length < 3 || !nameRegex.test(name)) {
        return { valid: false, message: "Name must be 3+ chars and contain only letters and spaces." };
    }
    return { valid: true };
}

const validatePassword = (password) => {
    if (!password || !passwordRegex.test(password)) {
        return {
            valid: false,
            message: "Password must contain 8+ chars (A-Z, a-z, 0-9 & special characters like @$!%*?&)"
        };
    }
    return { valid: true };
}

const validatePin = (pin) => {
    if (!pin || !pinRegex.test(pin)) {
        return { valid: false, message: "PIN must be exactly 4 or 6 digits." };
    }
    return { valid: true };
}

/* ── Login / Register ── */
function AuthPage({mode,navigate,route,setSession,pushToast}){
  const {useEffect,useRef,useState}=React;
  const redirect = route.search.get("redirect")||DEFAULT_REDIRECT;
  const [tab,setTab]=useState(mode);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [login,setLogin]=useState({email:"",password:""});
  const [reg,setReg]=useState({name:"",username:"",email:"",password:"",pin:""});
  const [uStatus,setUStatus]=useState(null);
  const timerRef=useRef(null);

  useEffect(()=>setTab(mode),[mode]);

  useEffect(()=>{
    const v = validateUsername(reg.username);
    if(!v.valid){
        setUStatus(reg.username.length > 0 ? "invalid" : null);
        return;
    }
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(async()=>{
      setUStatus("checking");
      try{
        const d=await apiRequest(`/api/auth/checkUser?username=${encodeURIComponent(reg.username)}`);
        setUStatus(d.available?"ok":"taken");
      }catch{setUStatus("invalid");}
    },350);
    return ()=>clearTimeout(timerRef.current);
  },[reg.username]);

  async function handleLogin(e){
    e.preventDefault(); setError(""); setLoading(true);
    try{
      const d=await apiRequest("/api/auth/login",{method:"POST",body:login});
      setSession({token:d.token,user:{...(d.user||{}),email:login.email}});
      pushToast("success","Welcome back to NepPay");
      navigate(redirect,{replace:true});
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  }

  async function handleRegister(e){
    e.preventDefault(); setError(""); 
    
    // Validate inputs before API call
    const vName = validateName(reg.name);
    if (!vName.valid) return setError(vName.message);
    const vUser = validateUsername(reg.username);
    if (!vUser.valid) return setError(vUser.message);
    const vPass = validatePassword(reg.password);
    if (!vPass.valid) return setError(vPass.message);
    const vPin = validatePin(reg.pin);
    if (!vPin.valid) return setError(vPin.message);

    setLoading(true);
    try{
      const d=await apiRequest("/api/auth/register",{method:"POST",body:reg});
      if(d.token){
        setSession({token:d.token,user:{...(d.user||{}),email:reg.email}});
        pushToast("success","Account created!");
        navigate(DEFAULT_REDIRECT,{replace:true});
      }else{
        pushToast("success","Account created. Please sign in.");
        navigate("/login",{replace:true});
      }
    }catch(err){setError(err.message);}
    finally{setLoading(false);}
  }

  function switchTab(t){ setError(""); setTab(t); navigate(t==="login"?"/login":"/register",{replace:true}); }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-icon"><WalletIcon/></div>
          <div>
            <div className="auth-logo-name">Nep<span style={{color:"#A78BFA"}}>Pay</span></div>
            <div className="auth-logo-sub">Nepal's Digital Wallet</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab==="login"?" active":""}`} onClick={()=>switchTab("login")}>Sign in</button>
          <button className={`auth-tab${tab==="register"?" active":""}`} onClick={()=>switchTab("register")}>Create account</button>
        </div>

        {error && <div className="auth-error" style={{marginBottom:"1rem", color: "var(--danger)", background: "var(--danger-light)", padding: "0.75rem", borderRadius: "var(--r-md)", fontSize: "0.85rem"}}>{error}</div>}

        {tab==="login"?(
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" required placeholder="you@example.com"
                value={login.email} onChange={e=>setLogin(p=>({...p,email:e.target.value}))}/>
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input className="field-input" type="password" required placeholder="Your password"
                value={login.password} onChange={e=>setLogin(p=>({...p,password:e.target.value}))}/>
            </div>
            <button className="auth-forgot" type="button" onClick={()=>navigate("/forgot")}>
              Forgot password or PIN?
            </button>
            <button className="btn btn-primary btn-w" type="submit" disabled={loading}>
              {loading?"Signing in…":"Sign in"}
            </button>
          </form>
        ):(
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Full name</label>
                <input className="field-input" type="text" required placeholder="Sita Sharma"
                  value={reg.name} onChange={e=>setReg(p=>({...p,name:e.target.value}))}/>
              </div>
              <div className="field">
                <label className="field-label">Username</label>
                <input className="field-input" type="text" required placeholder="sita_sharma"
                  value={reg.username} onChange={e=>setReg(p=>({...p,username:e.target.value}))}/>
                {uStatus==="ok"&&<p className="username-hint username-ok" style={{color: "var(--success)"}}>✓ Available</p>}
                {uStatus==="taken"&&<p className="username-hint username-taken" style={{color: "var(--danger)"}}>✗ Already taken</p>}
                {uStatus==="checking"&&<p className="username-hint username-checking">Checking…</p>}
                {uStatus==="invalid"&&<p className="username-hint username-taken" style={{color: "var(--danger)"}}>Invalid format</p>}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" required placeholder="you@example.com"
                value={reg.email} onChange={e=>setReg(p=>({...p,email:e.target.value}))}/>
            </div>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" required placeholder="Min 8 chars"
                  value={reg.password} onChange={e=>setReg(p=>({...p,password:e.target.value}))}/>
              </div>
              <div className="field">
                <label className="field-label">Transfer PIN</label>
                <input className="field-input" type="password" required inputMode="numeric" placeholder="4 or 6 digits"
                  value={reg.pin} onChange={e=>setReg(p=>({...p,pin:e.target.value}))}/>
              </div>
            </div>
            <button className="btn btn-primary btn-w" type="submit" disabled={loading}>
              {loading?"Creating…":"Create account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Forgot ── */
function ForgotPage({route,navigate,pushToast}){
  const {useState}=React;
  const token=route.search.get("token");
  const type=route.search.get("type")||"password";
  const [loading,setLoading]=useState(false);
  const [form,setForm]=useState({email:"",type:"password"});
  const [newVal,setNewVal]=useState("");
  const [done,setDone]=useState(false);

  async function handleRequest(e){
    e.preventDefault(); setLoading(true);
    try{
      const d=await apiRequest("/api/auth/forgot",{method:"POST",body:form});
      setDone(true);
      pushToast("success",d.message||"Recovery link sent");
    }catch(err){pushToast("error",err.message);}
    finally{setLoading(false);}
  }

  async function handleReset(e){
    e.preventDefault(); 
    
    if (type === "pin") {
        const vPin = validatePin(newVal);
        if (!vPin.valid) return pushToast("error", vPin.message);
    } else {
        const vPass = validatePassword(newVal);
        if (!vPass.valid) return pushToast("error", vPass.message);
    }

    setLoading(true);
    try{
      const ep=type==="pin"?"/api/auth/forgot-pin":"/api/auth/forgot-password";
      const body=type==="pin"?{token,pin:newVal}:{token,password:newVal};
      const d=await apiRequest(ep,{method:"POST",body});
      pushToast("success",d.message||"Reset complete");
      navigate("/login",{replace:true});
    }catch(err){pushToast("error",err.message);}
    finally{setLoading(false);}
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <button className="auth-back-link" onClick={()=>navigate("/login")}>
          <Icon name="back" size={16}/> Back to sign in
        </button>
        <div className="auth-logo">
          <div className="auth-logo-icon"><WalletIcon/></div>
          <div>
            <div className="auth-logo-name">{token?"Reset your "+type:"Account recovery"}</div>
            <div className="auth-logo-sub">{token?`Enter a new ${type}`:"We'll send a recovery link"}</div>
          </div>
        </div>
        {token?(
          <form className="auth-form" onSubmit={handleReset}>
            <div className="field">
              <label className="field-label">New {type==="pin"?"PIN":"password"}</label>
              <input className="field-input" type="password" required
                placeholder={type==="pin"?"4 or 6 digits":"Strong new password"}
                value={newVal} onChange={e=>setNewVal(e.target.value)}/>
            </div>
            <button className="btn btn-primary btn-w" disabled={loading}>{loading?"Saving…":`Reset ${type}`}</button>
          </form>
        ):done?(
          <div className="auth-success">Recovery link sent to {form.email}. Check your inbox.</div>
        ):(
          <form className="auth-form" onSubmit={handleRequest}>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" required placeholder="your@email.com"
                value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
            </div>
            <div className="field">
              <label className="field-label">Recover</label>
              <select className="select-field" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                <option value="password">Password</option>
                <option value="pin">Transfer PIN</option>
              </select>
            </div>
            <button className="btn btn-primary btn-w" disabled={loading}>{loading?"Sending…":"Send recovery link"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Reset (logged in) ── */
function ResetPage({navigate,pushToast}){
  const {useState}=React;
  const [type,setType]=useState("password");
  const [loading,setLoading]=useState(false);
  const [f,setF]=useState({email:"",oldPassword:"",newPassword:"",oldPin:"",newPin:""});

  async function handleSubmit(e){
    e.preventDefault(); 
    
    if (type === "password") {
        const vPass = validatePassword(f.newPassword);
        if (!vPass.valid) return pushToast("error", vPass.message);
    } else {
        const vPin = validatePin(f.newPin);
        if (!vPin.valid) return pushToast("error", vPin.message);
    }

    setLoading(true);
    try{
      const body=type==="password"?{email:f.email,oldPassword:f.oldPassword,newPassword:f.newPassword}:{email:f.email,oldPin:f.oldPin,newPin:f.newPin};
      const d=await apiRequest(`/api/auth/reset?type=${type}`,{method:"POST",body});
      pushToast("success",d.message||"Updated successfully");
    }catch(err){pushToast("error",err.message);}
    finally{setLoading(false);}
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <button className="auth-back-link" onClick={()=>navigate("/settings")}>
          <Icon name="back" size={16}/> Back to profile
        </button>
        <div className="auth-logo">
          <div className="auth-logo-icon"><WalletIcon/></div>
          <div><div className="auth-logo-name">Reset credentials</div><div className="auth-logo-sub">You'll need your current {type}</div></div>
        </div>
        <div className="auth-tabs" style={{marginBottom:"1.25rem"}}>
          <button className={`auth-tab${type==="password"?" active":""}`} onClick={()=>setType("password")}>Password</button>
          <button className={`auth-tab${type==="pin"?" active":""}`} onClick={()=>setType("pin")}>Transfer PIN</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" required value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/>
          </div>
          {type==="password"?(
            <div className="two-col">
              <div className="field"><label className="field-label">Old password</label><input className="field-input" type="password" required value={f.oldPassword} onChange={e=>setF(p=>({...p,oldPassword:e.target.value}))}/></div>
              <div className="field"><label className="field-label">New password</label><input className="field-input" type="password" required value={f.newPassword} onChange={e=>setF(p=>({...p,newPassword:e.target.value}))}/></div>
            </div>
          ):(
            <div className="two-col">
              <div className="field"><label className="field-label">Old PIN</label><input className="field-input" type="password" inputMode="numeric" required value={f.oldPin} onChange={e=>setF(p=>({...p,oldPin:e.target.value}))}/></div>
              <div className="field"><label className="field-label">New PIN</label><input className="field-input" type="password" inputMode="numeric" required value={f.newPin} onChange={e=>setF(p=>({...p,newPin:e.target.value}))}/></div>
            </div>
          )}
          <button className="btn btn-primary btn-w" disabled={loading}>{loading?"Updating…":`Reset ${type}`}</button>
        </form>
      </div>
    </div>
  );
}

/* ── Public pay page ── */
function PublicPayPage({route,session,navigate,pushToast}){
  const {useEffect,useState}=React;
  const id=decodeURIComponent(route.path.replace("/pay/",""));
  const reqAmt=route.search.get("amount");
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    apiRequest(`/api/user/public/${encodeURIComponent(id)}`)
      .then(d=>setUser(d))
      .catch(e=>pushToast("error",e.message))
      .finally(()=>setLoading(false));
  },[id]);

  function handleSend(){
    const target=user?.id||id;
    const path=`/send?target=${encodeURIComponent(target)}${reqAmt?`&amount=${encodeURIComponent(reqAmt)}`:""}`;
    session?.token?navigate(path):navigate(`/login?redirect=${encodeURIComponent(path)}`);
  }

  return (
    <div className="public-shell">
      <div className="public-box">
        <div className="public-header">
          <div className="auth-logo-icon"><WalletIcon/></div>
          <div>
            <div style={{fontWeight:700}}>Nep<span style={{color:"#A78BFA"}}>Pay</span></div>
            <div className="text-xs text-muted">Payment request</div>
          </div>
        </div>
        <div className="public-body">
          {loading?(
            <p className="text-muted text-sm" style={{textAlign:"center",padding:"1rem"}}>Loading recipient…</p>
          ):user?(
            <>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem",background:"var(--card-2)",borderRadius:"var(--r-xl)",border:"1px solid var(--border)"}}>
                <div className="public-user-avatar">{initials(user.name)}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:"0.95rem"}}>{user.name}</div>
                  <div className="text-xs text-muted">{user.id}</div>
                </div>
              </div>
              {[["Recipient",user.name],["Requested amount",reqAmt?fmt(reqAmt):"Open amount"],["Next step","Secure send flow"]].map(([l,v])=>(
                <div key={l} className="flex justify-between items-center">
                  <span className="text-sm text-muted">{l}</span>
                  <span style={{fontSize:"0.85rem",fontWeight:500}}>{v}</span>
                </div>
              ))}
              <button className="btn btn-primary btn-w mt-2" onClick={handleSend}>Send money →</button>
            </>
          ):(
            <p className="text-muted text-sm" style={{textAlign:"center",padding:"1rem"}}>Recipient not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

window.NepPayAuthPages = { AuthPage, ForgotPage, ResetPage, PublicPayPage };
})();

