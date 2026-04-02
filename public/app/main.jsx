(() => {
const {loadSession,saveSession,parseRoute,apiRequest,redirectToLogin,useToasts,ToastStack} = window.NepPayCore;
const {AuthPage,ForgotPage,ResetPage,PublicPayPage} = window.NepPayAuthPages;
const {WalletLayout} = window.NepPayWalletLayout;
const {DashboardPage,SendPage} = window.NepPayWalletPagesA;
const {ReceivePage,StatementsPage} = window.NepPayWalletPagesB;
const {StatisticsPage,ProfilePage} = window.NepPayWalletPagesC;

function App(){
  const {useEffect,useState}=React;
  const [session,setSession]=useState(loadSession());
  const [route,setRoute]=useState(parseRoute);
  const [balanceVisible,setBalanceVisible]=useState(false); // hidden by default
  const {toasts,push:pushToast}=useToasts();

  useEffect(()=>{
    const h=()=>React.startTransition(()=>setRoute(parseRoute()));
    window.addEventListener("popstate",h);
    return()=>window.removeEventListener("popstate",h);
  },[]);

  function navigate(path,{replace=false}={}){
    replace?window.history.replaceState({},"",path):window.history.pushState({},"",path);
    React.startTransition(()=>setRoute(parseRoute()));
  }

  function updateSession(s){saveSession(s);setSession(s);}

  function logout(){
    if(session?.token) apiRequest("/api/auth/logout",{method:"POST",token:session.token}).catch(()=>null);
    updateSession(null);
    navigate("/login",{replace:true});
    pushToast("info","You have been signed out");
  }

  const publicRoutes=["/login","/register","/forgot"];
  const isPublic=publicRoutes.includes(route.path)||route.path.startsWith("/pay/");

  useEffect(()=>{
    if(!isPublic&&!session?.token) setRoute(redirectToLogin(`${route.path}${window.location.search}`));
  },[isPublic,route.path,session]);

  const shared={session,setSession:updateSession,route,navigate,pushToast,balanceVisible,setBalanceVisible,logout};

  let page;
  if(route.path==="/login"||route.path==="/register"){
    page=<AuthPage mode={route.path==="/register"?"register":"login"} {...shared}/>;
  }else if(route.path==="/forgot"){
    page=<ForgotPage {...shared}/>;
  }else if(route.path==="/reset"){
    page=<ResetPage {...shared}/>;
  }else if(route.path.startsWith("/pay/")){
    page=<PublicPayPage {...shared}/>;
  }else{
    const walletPage=
      route.path==="/send"?<SendPage {...shared}/>:
      route.path==="/receive"?<ReceivePage {...shared}/>:
      route.path==="/statements"?<StatementsPage {...shared}/>:
      route.path==="/statistics"?<StatisticsPage {...shared}/>:
      (route.path==="/settings"||route.path==="/profile")?<ProfilePage {...shared}/>:
      <DashboardPage {...shared}/>;
    const activePath=route.path==="/profile"?"/settings":route.path;
    page=<WalletLayout currentPath={activePath} {...shared}>{walletPage}</WalletLayout>;
  }

  return <>{page}<ToastStack toasts={toasts}/></>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
})();
