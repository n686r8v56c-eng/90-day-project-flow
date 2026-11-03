import React,{useState,useEffect,useCallback} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Star,LogOut,LogIn,RefreshCw} from 'lucide-react';
import './DanceFlowKpi.css';

// Sing Flow browser publishable credentials; environment configuration takes precedence.
const singUrl=import.meta.env.VITE_SING_SUPABASE_URL||'https://sniilpldbbvsiwcvqvnc.supabase.co';
const singKey=import.meta.env.VITE_SING_SUPABASE_ANON_KEY||'sb_publishable_CyRxvzO0ZD8vpKc61w386w_IZVVgTi7';
export const sing=singUrl&&singKey?createClient(singUrl,singKey,{auth:{storageKey:'90day-sing-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export const singKpiSpecs=[
 {id:'trainingCount',label:'훈련 등록',unit:'개'},
 {id:'trainingMinutes',label:'훈련 시간',unit:'분'},
 {id:'techniqueCount',label:'기술 등록',unit:'개'},
 {id:'techniqueMinutes',label:'기술 습득 시간',unit:'분'},
 {id:'memoCount',label:'총 학습 메모',unit:'개'},
 {id:'completedSongs',label:'완곡',unit:'곡'}
];
const list=x=>Array.isArray(x)?x:[];
export function countSingKpis(data={}){
 const collections=[
  {skills:list(data.trainings),bookmarks:list(data.trainingStudio?.bookmarks),notes:list(data.trainingStudio?.notes)},
  {skills:list(data.techniqueStudio?.skills),bookmarks:list(data.techniqueStudio?.bookmarks),notes:list(data.techniqueStudio?.notes)},
  {skills:list(data.songs),bookmarks:list(data.songStudio?.bookmarks),notes:list(data.songStudio?.notes)}
 ];
 const memoCount=collections.reduce((total,{skills,bookmarks,notes})=>{
  const skillNotes=skills.reduce((n,item)=>n+(String(item.memo||item.description||'').trim()?1:0)+list(item.statusHistory).filter(h=>String(h.note||'').trim()).length,0);
  const clipNotes=bookmarks.reduce((n,b)=>n+list(b.clips).reduce((m,c)=>m+(String(c.caution||'').trim()?1:0)+(String(c.memo||'').trim()?1:0),0),0);
  return total+skillNotes+clipNotes+notes.length;
 },0);
 const mins=kind=>Number(((Number(data.playbackSeconds?.[kind])||0)/60).toFixed(1));
 return {trainingCount:list(data.trainings).length,trainingMinutes:mins('training'),techniqueCount:list(data.techniqueStudio?.skills).length,techniqueMinutes:mins('technique'),memoCount,completedSongs:list(data.songs).filter(x=>x.completed).length};
}
function useSing(){
 const [session,setSession]=useState(null),[payload,setPayload]=useState(null),[loading,setLoading]=useState(!!sing),[error,setError]=useState('');
 const refresh=useCallback(async s=>{
  if(!sing||!s?.user?.id){setPayload(null);setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const {data,error}=await sing.from('vocal_profiles').select('app_data').eq('user_id',s.user.id).maybeSingle();
   if(error)throw error;
   setPayload(data?.app_data||null);
  }catch(e){setPayload(null);setError(e.message||'Sing Flow 기록 조회 실패');}finally{setLoading(false)}
 },[]);
 useEffect(()=>{
  if(!sing){setLoading(false);return}
  let active=true;
  sing.auth.getSession().then(({data})=>{if(active){setSession(data.session);refresh(data.session)}}).catch(e=>{if(active){setLoading(false);setError(e.message)}});
  const {data:{subscription}}=sing.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);refresh(s)}});
  const resume=()=>{if(document.visibilityState==='visible')sing.auth.getSession().then(({data})=>{if(active)refresh(data.session)})};
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return()=>{active=false;subscription.unsubscribe();window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume)};
 },[refresh]);
 return {session,payload,loading,error,refresh:()=>refresh(session)};
}
export function SingFlowKpiCard({featured=[]}){
 const {session,payload,loading,error}=useSing();
 if(!sing)return <div className="kpi-empty">Sing Flow 연결 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Sing Flow 계정 연결하기</div>;
 if(loading)return <div className="kpi-empty">Sing Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Sing Flow 조회 오류</div>;
 if(!payload)return <div className="kpi-empty">Sing Flow 저장 기록 없음</div>;
 if(!featured.length)return <div className="kpi-empty">대표 KPI ☆ 선택하기</div>;
 const results=countSingKpis(payload);
 return <>{featured.filter(id=>singKpiSpecs.some(m=>m.id===id)).slice(0,2).map(id=>{
  const metric=singKpiSpecs.find(m=>m.id===id);
  return <div className="kpi-preview" key={id}><small>{metric.label}</small><strong>{results[id].toLocaleString('ko-KR')} {metric.unit}</strong><span>Sing Flow 자동 연동</span></div>;
 })}</>;
}
export default function SingFlowKpi({featured=[],onToggleFeatured}){
 const {session,payload,loading,error,refresh}=useSing();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const results=countSingKpis(payload||{});
 const login=async e=>{e.preventDefault();if(!sing)return;setBusy(true);setAuthError('');try{const {error}=await sing.auth.signInWithPassword({email,password});if(error)setAuthError(error.message)}catch(e){setAuthError(e.message||'로그인 오류')}finally{setPassword('');setBusy(false)}};
 return <section className="dance-kpi-panel">
  <div className="dance-kpi-head"><div><strong>Sing Flow · 노래 KPI</strong><small>훈련 · 기술 · 학습 메모 · 완곡, 원본 앱 기준</small></div>{session&&<button type="button" onClick={refresh} title="새로고침" aria-label="새로고침"><RefreshCw size={17}/></button>}</div>
  {!sing?<p className="dance-kpi-error">Sing Flow 연동 설정을 확인해 줘.</p>:!session?<form className="dance-kpi-login" onSubmit={login}><p>Sing Flow 계정으로 로그인하거나 연동 계정 관리에서 연결해 줘.</p><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Sing Flow 이메일" autoComplete="username"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"/><button type="submit" disabled={busy}><LogIn size={15}/>{busy?'연결 중…':'Sing Flow 연결'}</button></form>:<>
   <div className="dance-kpi-session"><span>Sing Flow 연결됨</span><button type="button" onClick={()=>sing.auth.signOut()}><LogOut size={15}/> 연결 해제</button></div>
   {loading?<p className="dance-kpi-note">기록 불러오는 중…</p>:payload?<div className="dance-kpi-grid">{singKpiSpecs.map(m=><div className="dance-kpi-metric" key={m.id}><div className="dance-kpi-top"><span>{m.label}</span><button type="button" title="대표 KPI 최대 2개" aria-label={m.label+(featured.includes(m.id)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(m.id)} onClick={()=>onToggleFeatured?.(m.id)}><Star size={19} fill={featured.includes(m.id)?'#9873c8':'none'} color={featured.includes(m.id)?'#9873c8':'#aaa0b3'}/></button></div><strong>{results[m.id].toLocaleString('ko-KR')} <small>{m.unit}</small></strong><small>Sing Flow 자동 조회</small></div>)}</div>:<p className="dance-kpi-note">Sing Flow에 저장된 기록이 없어. 원본 앱의 로그인을 확인해 줘.</p>}
  </>}
  <p className="dance-kpi-note">훈련 시간과 기술 습득 시간은 각 북마크의 실제 재생 누적 시간으로 계산해. 원본 기록은 변경하지 않아.</p>
  {(error||authError)&&<p className="dance-kpi-error" role="alert">{error||authError}</p>}
 </section>;
}
