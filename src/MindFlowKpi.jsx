import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {RefreshCw,LogIn,LogOut,Star} from 'lucide-react';
const url=import.meta.env.VITE_MIND_SUPABASE_URL || 'https://nywmfapcjqlvjhrdbrrc.supabase.co';
const key=import.meta.env.VITE_MIND_SUPABASE_ANON_KEY || 'sb_publishable_Tzx05-pZTox6Kwpg-PktMA_-qz_g2MY';
export const mind=url&&key?createClient(url,key,{auth:{storageKey:'ninety-day-mind-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
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
export function MindKpiCard({featured=[]}){
 const {session,items,loading,error}=useMindRecords();
 const stats=useMemo(()=>items?calc(items,today()):null,[items]);
 const chosen=(stats||[]).filter(x=>featured.includes(x.name)).sort((a,b)=>featured.indexOf(a.name)-featured.indexOf(b.name)).slice(0,2);
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 if(!mind)return <div className="kpi-empty">Mind Flow 연결 필요</div>;
 if(!session)return <div className="kpi-empty">Mind Flow 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Mind Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Mind Flow 조회 오류</div>;
 return <>{chosen.map(x=><div className="kpi-preview" key={x.name}><small>{x.name}</small><strong>{x.value.toLocaleString('ko-KR')}{x.unit}</strong><span>오늘 목표 {x.goal.toLocaleString('ko-KR')}{x.unit}</span><div className="mini"><div style={{width:`${Math.min(100,x.goal?x.value/x.goal*100:0)}%`}}/></div></div>)}</>;
}
export default function MindFlowKpi({featured=[],onToggleFeatured}){
 const {session,items,loading,error,refresh}=useMindRecords();
 const [login,setLogin]=useState({email:'',password:''}),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const stats=useMemo(()=>items?calc(items,today()):null,[items]);
 const signIn=async e=>{e.preventDefault();if(!mind)return;setBusy(true);setAuthError('');const {error}=await mind.auth.signInWithPassword(login);if(error)setAuthError(error.message);setLogin(x=>({...x,password:''}));setBusy(false);};
 return <section className="sf-link"><header className="sf-link-head"><div><strong>Mind Flow · 오늘의 수행</strong><small>호흡 · 명상 · 만트라 / 읽기 전용</small></div>{session&&<button type="button" onClick={refresh} aria-label="새로고침"><RefreshCw size={16}/></button>}</header>
 {!mind?<p className="sf-notice">Cloudflare Pages에 VITE_MIND_SUPABASE_URL과 VITE_MIND_SUPABASE_ANON_KEY를 설정해 주세요.</p>:!session?
 <form className="sf-login" onSubmit={signIn}><p>Mind Flow 계정으로 로그인하면 해당 계정의 기록만 가져와요.</p><input type="email" required placeholder="Mind Flow 이메일" autoComplete="username" aria-label="Mind Flow 이메일" value={login.email} onChange={e=>setLogin(x=>({...x,email:e.target.value}))}/><input type="password" required placeholder="비밀번호" autoComplete="current-password" aria-label="Mind Flow 비밀번호" value={login.password} onChange={e=>setLogin(x=>({...x,password:e.target.value}))}/><button type="submit" disabled={busy}><LogIn size={15}/> Mind Flow 연결</button></form>:
 <><div className="sf-link-session"><span>{session.user.email}</span><button type="button" onClick={()=>mind.auth.signOut()}><LogOut size={14}/> 연결 해제</button></div>
 {loading?<p className="sf-notice">기록을 불러오는 중…</p>:stats?<div className="sf-kpi-grid">{stats.map(x=><div className="sf-kpi" key={x.name}><div className="sf-kpi-label"><span>{x.name}</span><button type="button" className="sf-star" aria-label={x.name+(featured.includes(x.name)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(x.name)} title="대표 KPI 선택 (최대 2개)" onClick={e=>{e.preventDefault();e.stopPropagation();onToggleFeatured?.(x.name);}} style={{position:'relative',zIndex:2,touchAction:'manipulation',minWidth:40,minHeight:40,flex:'0 0 40px',marginLeft:'auto',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:8,background:'transparent',border:0,cursor:'pointer'}}><Star size={19} fill={featured.includes(x.name)?'#9873c8':'none'} color={featured.includes(x.name)?'#9873c8':'#aaa0b3'}/></button></div><strong>{x.value} / {x.goal}{x.unit}</strong><small>{Math.round(x.value/x.goal*100)}% 달성</small><div className="sf-progress"><i style={{width:Math.min(100,x.value/x.goal*100)+'%'}}/></div></div>)}</div>:<p className="sf-notice">조회된 기록이 없어요.</p>}</>}
 {(error||authError)&&<p className="sf-error" role="alert">{error||authError}</p>}
 </section>;
}
