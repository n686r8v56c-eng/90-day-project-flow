import React,{useCallback,useEffect,useState} from 'react';
import {Link2,ChevronDown,Check,AlertCircle,LockKeyhole,RefreshCw} from 'lucide-react';
import {spend} from './SpendFlowKpi.jsx';
import {mind} from './MindFlowKpi.jsx';
import {care} from './CareLogKpi.jsx';
import {beauty} from './BeautyCareKpi.jsx';
import {dance} from './DanceFlowKpi.jsx';
import {sing} from './SingFlowKpi.jsx';
import {fashion} from './FashionFlowKpi.jsx';
import {cosmetic} from './CosmeticFlowKpi.jsx';
import {focusClient} from './useFocusTime.js';
import './AccountConnections.css';

const apps=[
 {id:'spend',label:'Spend',client:spend},
 {id:'focus',label:'Focus',client:focusClient},
 {id:'mind',label:'Mind',client:mind},
 {id:'care',label:'Care',client:care},
 {id:'beauty',label:'Beauty Care · Beauty / Body',client:beauty},
 {id:'dance',label:'Dance · Sequence',client:dance},
 {id:'sing',label:'Sing Flow · Sing',client:sing},
 {id:'fashion',label:'Fashion Flow · Fashion',client:fashion},
 {id:'cosmetic',label:'Cosmetic Flow · Cosmetic',client:cosmetic}
];
const statusShape=()=>Object.fromEntries(apps.map(x=>[x.id,x.client?'checking':'unconfigured']));
export default function AccountConnections(){
 const [expanded,setExpanded]=useState(false);
 const [states,setStates]=useState(statusShape);
 const [emails,setEmails]=useState({});
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [errors,setErrors]=useState({});
 const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{
  const next=await Promise.all(apps.map(async app=>{
   if(!app.client)return [app.id,'unconfigured',null];
   try{const {data,error}=await app.client.auth.getSession();if(error)return [app.id,'error',null];return [app.id,data?.session?'connected':'disconnected',data?.session?.user?.email||null];}
   catch{return [app.id,'error',null];}
  }));
  setStates(Object.fromEntries(next.map(([id,state])=>[id,state])));
  setEmails(Object.fromEntries(next.map(([id,,mail])=>[id,mail])));
 },[]);
 useEffect(()=>{
  refresh();
  const subscriptions=apps.filter(app=>app.client).map(app=>app.client.auth.onAuthStateChange(()=>{refresh();}).data.subscription);
  const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{subscriptions.forEach(s=>s.unsubscribe());document.removeEventListener('visibilitychange',onVisible)};
 },[refresh]);
 const connected=apps.filter(app=>states[app.id]==='connected').length;
 const configured=apps.filter(app=>!!app.client).length;
 const connectAll=async e=>{
  e.preventDefault();
  if(busy||!email.trim()||!password)return;
  setBusy(true);setNotice('');setErrors({});
  const failed={};let success=0,skipped=0;
  try{
   for(const app of apps){
    if(!app.client)continue;
    try{
     const {data:current,error:sessionError}=await app.client.auth.getSession();
     if(!sessionError&&current?.session?.user?.email?.toLowerCase()===email.trim().toLowerCase()){skipped++;continue;}
     const {error}=await app.client.auth.signInWithPassword({email:email.trim(),password});
     if(error){failed[app.id]=error.message;}else success++;
    }catch(err){failed[app.id]=err?.message||'연결 실패';}
   }
   setErrors(failed);
   setNotice('새로 연결 '+success+'개 · 유지 '+skipped+'개'+(Object.keys(failed).length?' · 실패 '+Object.keys(failed).length+'개':''));
  }finally{
   setPassword('');setBusy(false);await refresh();
  }
 };
 return <section className="ac-wrap" aria-label="연동 앱 계정">
  <button type="button" className="ac-trigger" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}>
   <Link2 size={16}/><span>연동 계정 관리</span><small>{connected}/{configured} 연결됨</small><ChevronDown size={16} className={expanded?'ac-up':''}/>
  </button>
  {expanded&&<div className="ac-body">
   <p>같은 이메일·비밀번호로 가입한 앱을 한 번에 연결해. 비밀번호는 저장하지 않아.</p>
   <form onSubmit={connectAll} className="ac-form">
    <input aria-label="연동 앱 이메일" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="공통 이메일"/>
    <input aria-label="연동 앱 비밀번호" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="공통 비밀번호"/>
    <button type="submit" disabled={busy}>{busy?'연결하는 중…':'앱 계정 한 번에 연결'}</button>
   </form>
   <div className="ac-security"><LockKeyhole size={13}/> 각 앱에 별도로 로그인하며 비밀번호는 완료 후 지워져.</div>
   {notice&&<div className="ac-notice" role="status">{notice}</div>}
   <div className="ac-apps">{apps.map(app=><div className="ac-app" key={app.id}>
    <span>{app.label}</span><span className={states[app.id]==='connected'?'ac-ok':'ac-muted'}>{states[app.id]==='connected'?<><Check size={14}/> 연결됨</>:states[app.id]==='unconfigured'?'환경변수 필요':states[app.id]==='checking'?'확인 중':states[app.id]==='error'?<><AlertCircle size={14}/> 상태 확인 실패</>:'연결 필요'}</span>
    {errors[app.id]&&<small className="ac-error">{errors[app.id]}</small>}
   </div>)}</div>
   <button type="button" className="ac-refresh" onClick={refresh} disabled={busy}><RefreshCw size={14}/> 연결 상태 새로고침</button>
  </div>}
 </section>;
}
