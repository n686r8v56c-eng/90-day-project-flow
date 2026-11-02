import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Star,RefreshCw,LogIn,LogOut} from 'lucide-react';
import './FashionFlowKpi.css';

// Public publishable key only. A separate auth storage key protects the other app sessions.
const url=import.meta.env.VITE_FASHION_SUPABASE_URL||'https://vevgqerlvvjsspaqeqzn.supabase.co';
const key=import.meta.env.VITE_FASHION_SUPABASE_ANON_KEY||'sb_publishable_qPsIOoYhRZ4w19ISPhH5XA_W-tFXTrQ';
export const fashion=url&&key?createClient(url,key,{auth:{storageKey:'90day-fashion-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const fashionMetrics=[{id:'items',name:'보유 아이템',table:'wardrobe_items'},{id:'outfits',name:'저장한 코디',table:'outfits'},{id:'looks',name:'잇걸룩 코디',table:'inspiration_looks'}];
const empty={items:0,outfits:0,looks:0};
function useFashionStats(){
 const [session,setSession]=useState(null),[stats,setStats]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async sess=>{
  if(!fashion||!sess?.user?.id){setStats(null);setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const responses=await Promise.all(fashionMetrics.map(m=>fashion.from(m.table).select('id',{count:'exact',head:true}).eq('user_id',sess.user.id)));
   const issue=responses.find(r=>r.error);
   if(issue)throw issue.error;
   setStats(Object.fromEntries(fashionMetrics.map((m,i)=>[m.id,responses[i].count??0])));
  }catch(e){setStats(null);setError(e?.message||'Fashion Flow 조회 실패');}finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  if(!fashion){setLoading(false);return;}
  let live=true;
  fashion.auth.getSession().then(({data,error})=>{if(live){setSession(data?.session||null);if(error)setError(error.message);refresh(data?.session)}}).catch(e=>{if(live){setError(e.message);setLoading(false);}});
  const {data:{subscription}}=fashion.auth.onAuthStateChange((_event,next)=>{if(live){setSession(next);refresh(next)}});
  const onResume=()=>{if(document.visibilityState==='visible')fashion.auth.getSession().then(({data})=>{if(live)refresh(data?.session)})};
  document.addEventListener('visibilitychange',onResume);
  window.addEventListener('focus',onResume);
  return()=>{live=false;subscription.unsubscribe();document.removeEventListener('visibilitychange',onResume);window.removeEventListener('focus',onResume)};
 },[refresh]);
 return {session,stats,loading,error,refresh:()=>refresh(session)};
}
export function FashionKpiCard({featured=[]}){
 const {session,stats,loading,error}=useFashionStats();
 if(!fashion)return <div className="kpi-empty">Fashion Flow 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Fashion Flow 연결하기</div>;
 if(loading&&!stats)return <div className="kpi-empty">Fashion Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Fashion Flow 조회 오류</div>;
 if(!stats)return <div className="kpi-empty">Fashion Flow 기록 없음</div>;
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 const selected=featured.filter(id=>fashionMetrics.some(m=>m.id===id)).slice(0,2);
 return <>{selected.map(id=>{const metric=fashionMetrics.find(x=>x.id===id);return metric?<div className="kpi-preview" key={id}><small>{metric.name}</small><strong>{stats[id].toLocaleString('ko-KR')}개</strong><span>Fashion Flow 연동</span></div>:null})}</>;
}
export default function FashionFlowKpi({featured=[],onToggleFeatured}){
 const {session,stats,loading,error,refresh}=useFashionStats();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const login=async e=>{e.preventDefault();if(!fashion)return;setBusy(true);setAuthError('');try{const {error}=await fashion.auth.signInWithPassword({email,password});if(error)setAuthError(error.message);}catch(e){setAuthError(e.message||'로그인 오류');}finally{setPassword('');setBusy(false);}};
 const shown=useMemo(()=>stats||empty,[stats]);
 return <section className="fk-panel">
  <div className="fk-head"><div><strong>Fashion Flow · KPI 연동</strong><small>인벤토리 · 코디 · 잇걸룩의 현재 등록 개수</small></div>{session&&<button type="button" onClick={refresh} title="새로고침" aria-label="새로고침"><RefreshCw size={17}/></button>}</div>
  {!fashion?<p className="fk-error">Fashion Flow 연결 설정을 확인해 줘.</p>:!session?<form className="fk-login" onSubmit={login}><p>Fashion Flow 계정으로 로그인하거나, 홈 상단 '연동 계정 관리'에서 한 번에 연결해 줘.</p><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Fashion Flow 이메일" autoComplete="username"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"/><button type="submit" disabled={busy}><LogIn size={15}/>{busy?'연결 중…':'Fashion Flow 연결'}</button></form>:<>
   <div className="fk-session"><span>Fashion Flow 연결됨</span><button type="button" onClick={()=>fashion.auth.signOut()}><LogOut size={14}/> 연결 해제</button></div>
   {loading&&!stats?<p className="fk-notice">기록 불러오는 중…</p>:<div className="fk-grid">{fashionMetrics.map(m=><div className="fk-metric" key={m.id}><div className="fk-metric-title"><span>{m.name}</span><button type="button" aria-label={m.name+(featured.includes(m.id)?' 대표 KPI 해제':' 대표 KPI 설정')} aria-pressed={featured.includes(m.id)} onClick={()=>onToggleFeatured?.(m.id)} title="카드에 표시할 대표 KPI 최대 2개"><Star size={18} color={featured.includes(m.id)?'#9470c5':'#b2a7ba'} fill={featured.includes(m.id)?'#9470c5':'none'}/></button></div><strong>{shown[m.id].toLocaleString('ko-KR')} <small>개</small></strong><small>Fashion Flow 자동 조회</small></div>)}</div>}
  </>}
  {error&&<p role="alert" className="fk-error">기록 조회 오류: {error}</p>}{authError&&<p role="alert" className="fk-error">{authError}</p>}
  <p className="fk-notice">등록된 행 수 기준. 원본 데이터는 수정하지 않고 읽기만 해.</p>
 </section>;
}
