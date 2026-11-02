import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {RefreshCw,LogIn,LogOut} from 'lucide-react';
const url=import.meta.env.VITE_MIND_SUPABASE_URL || 'https://nywmfapcjqlvjhrdbrrc.supabase.co';
const key=import.meta.env.VITE_MIND_SUPABASE_ANON_KEY || 'sb_publishable_Tzx05-pZTox6Kwpg-PktMA_-qz_g2MY';
const mind=url&&key?createClient(url,key,{auth:{storageKey:'ninety-day-mind-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
const calc=(rows,date)=>{
 const sessions=(rows||[]).filter(x=>x.kind==='session'&&!x.deleted).map(x=>x.payload||{}).filter(x=>x.date===date);
 return [
  {name:'호흡',value:sessions.filter(x=>x.type==='호흡'||x.type==='호흡 훈련').reduce((n,x)=>n+(Number(x.count)||0),0),goal:12,unit:'회'},
  {name:'명상',value:Math.floor(sessions.filter(x=>x.type==='명상'||x.type==='자연음 명상').reduce((n,x)=>n+(Number(x.secs)||0),0)/60),goal:20,unit:'분'},
  {name:'만트라',value:Math.floor(sessions.filter(x=>x.type==='만트라').reduce((n,x)=>n+(Number(x.secs)||0),0)/60),goal:15,unit:'분'}
 ];
};
function useMindRecords(){
 const [session,setSession]=useState(null),[items,setItems]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=async(s)=>{if(!mind||!s?.user?.id){setItems(null);setLoading(false);return;}setLoading(true);setError('');
 const {data,error:e}=await mind.from('mindflow_mantra_entries').select('kind,payload,deleted').eq('user_id',s.user.id).eq('kind','session');
 if(e){setItems(null);setError(e.message)}else setItems(data||[]);setLoading(false);};
 useEffect(()=>{if(!mind){setLoading(false);return;}let active=true;
 mind.auth.getSession().then(({data})=>{if(active){setSession(data.session);refresh(data.session)}});
 const {data:{subscription}}=mind.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);refresh(s)}});
 const onFocus=()=>{if(document.visibilityState==='visible')mind.auth.getSession().then(({data})=>{if(active)refresh(data.session)})};
 window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
 return()=>{active=false;subscription.unsubscribe();window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus)};},[]);
 return {session,items,loading,error,refresh:()=>refresh(session)};
}
export function MindKpiCard(){
 const {session,items,loading,error}=useMindRecords();
 const stats=useMemo(()=>items?calc(items,today()):null,[items]);
 if(!mind)return <div className="kpi-empty">Mind Flow 환경변수 연결 필요</div>;
 if(!session)return <div className="kpi-empty">Mind Flow 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Mind Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Mind Flow 조회 오류</div>;
 return <>{stats?.map(x=><div className="kpi-preview" key={x.name}><small>{x.name}</small><strong>{x.value}{x.unit} / {x.goal}{x.unit}</strong><span>오늘 달성률 {Math.round(x.value/x.goal*100)}%</span></div>)}</>;
}
export default function MindFlowKpi(){
 const {session,items,loading,error,refresh}=useMindRecords();
 const [login,setLogin]=useState({email:'',password:''}),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const stats=useMemo(()=>items?calc(items,today()):null,[items]);
 const signIn=async e=>{e.preventDefault();if(!mind)return;setBusy(true);setAuthError('');const {error}=await mind.auth.signInWithPassword(login);if(error)setAuthError(error.message);setLogin(x=>({...x,password:''}));setBusy(false);};
 return <section className="sf-link"><header className="sf-link-head"><div><strong>Mind Flow · 오늘의 수행</strong><small>호흡 · 명상 · 만트라 / 읽기 전용</small></div>{session&&<button type="button" onClick={refresh} aria-label="새로고침"><RefreshCw size={16}/></button>}</header>
 {!mind?<p className="sf-notice">Cloudflare Pages에 VITE_MIND_SUPABASE_URL과 VITE_MIND_SUPABASE_ANON_KEY를 설정해 주세요.</p>:!session?
 <form className="sf-login" onSubmit={signIn}><p>Mind Flow 계정으로 로그인하면 해당 계정의 기록만 가져와요.</p><input type="email" required placeholder="Mind Flow 이메일" autoComplete="username" aria-label="Mind Flow 이메일" value={login.email} onChange={e=>setLogin(x=>({...x,email:e.target.value}))}/><input type="password" required placeholder="비밀번호" autoComplete="current-password" aria-label="Mind Flow 비밀번호" value={login.password} onChange={e=>setLogin(x=>({...x,password:e.target.value}))}/><button type="submit" disabled={busy}><LogIn size={15}/> Mind Flow 연결</button></form>:
 <><div className="sf-link-session"><span>{session.user.email}</span><button type="button" onClick={()=>mind.auth.signOut()}><LogOut size={14}/> 연결 해제</button></div>
 {loading?<p className="sf-notice">기록을 불러오는 중…</p>:stats?<div className="sf-kpi-grid">{stats.map(x=><div className="sf-kpi" key={x.name}><div className="sf-kpi-label"><span>{x.name}</span></div><strong>{x.value} / {x.goal}{x.unit}</strong><small>{Math.round(x.value/x.goal*100)}% 달성</small><div className="sf-progress"><i style={{width:Math.min(100,x.value/x.goal*100)+'%'}}/></div></div>)}</div>:<p className="sf-notice">조회된 기록이 없어요.</p>}</>}
 {(error||authError)&&<p className="sf-error" role="alert">{error||authError}</p>}
 </section>;
}
