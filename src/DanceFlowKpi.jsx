import React,{useState,useEffect,useCallback,useMemo} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Star,LogOut,LogIn,RefreshCw} from 'lucide-react';
import './DanceFlowKpi.css';

// Dance Flow's public browser credentials; deploy-specific VITE_DANCE_* vars take precedence.
const danceUrl=import.meta.env.VITE_DANCE_SUPABASE_URL||"https://cmaexvxrvufzhbuikiqj.supabase.co";
const danceKey=import.meta.env.VITE_DANCE_SUPABASE_ANON_KEY||"sb_publishable_iGV_fpBj1aIAdQdmA3V1WQ_g2j46S80";
const dance=danceUrl&&danceKey?createClient(danceUrl,danceKey,{auth:{storageKey:'90day-dance-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const specs=[{id:'registered',label:'등록 동작'},{id:'learned',label:'습득 동작'},{id:'completed',label:'완성 안무'}];
const asList=value=>Array.isArray(value)?value:[];
export function countDanceKpis(payload,genre='all'){
 const allMoves=asList(payload?.moves),allChoreos=asList(payload?.choreos);
 const filter=list=>genre==='all'?list:list.filter(row=>row.genre===genre);
 const moves=filter(allMoves),choreos=filter(allChoreos);
 return {registered:moves.length,learned:moves.filter(x=>x.status==='습득 완료').length,completed:choreos.filter(x=>asList(x.segments).length>0&&x.segments.every(part=>part.status==='완성')).length};
}
function useDance(){
 const [session,setSession]=useState(null);
 const [payload,setPayload]=useState(null);
 const [loading,setLoading]=useState(!!dance);
 const [error,setError]=useState('');
 const refresh=useCallback(async current=>{
  if(!dance||!current?.user?.id){setPayload(null);setLoading(false);return}
  setLoading(true);setError('');
  const {data,error}=await dance.from('dance_flow_data').select('payload').eq('user_id',current.user.id).maybeSingle();
  if(error){setPayload(null);setError(error.message);}else setPayload(data?.payload||null);
  setLoading(false);
 },[]);
 useEffect(()=>{
  if(!dance){setLoading(false);return;}
  let active=true;
  dance.auth.getSession().then(({data})=>{if(active){setSession(data.session);refresh(data.session);}}).catch(e=>{if(active){setLoading(false);setError(e.message)}});
  const {data:{subscription}}=dance.auth.onAuthStateChange((_event,s)=>{if(active){setSession(s);refresh(s)}});
  const resume=()=>{if(document.visibilityState==='visible')dance.auth.getSession().then(({data})=>{if(active)refresh(data.session)});};
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  return()=>{active=false;subscription.unsubscribe();window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume)};
 },[refresh]);
 return {session,payload,loading,error,refresh:()=>refresh(session)};
}
export function DanceFlowKpiCard({featured=[]}){
 const {session,payload,loading,error}=useDance();
 if(!dance)return <div className="kpi-empty">Dance Flow 연결 설정 필요</div>;
 if(!session)return <div className="kpi-empty">Dance Flow 연결하기</div>;
 if(loading)return <div className="kpi-empty">Dance Flow 불러오는 중…</div>;
 if(error)return <div className="kpi-empty">Dance Flow 조회 오류</div>;
 if(!payload)return <div className="kpi-empty">Dance Flow 저장 기록 없음</div>;
 const results=countDanceKpis(payload);
 const picks=featured.length?featured:['registered','learned'];
 return <>{picks.filter(id=>specs.some(m=>m.id===id)).slice(0,2).map(id=>{
  const metric=specs.find(m=>m.id===id);
  return <div className="kpi-preview" key={id}><small>{metric.label} · 전체 장르</small><strong>{results[id].toLocaleString('ko-KR')} {id==='completed'?'개':'개'}</strong><span>{id==='learned'?('등록 동작 '+results.registered+'개'):id==='completed'?('등록 안무 '+asList(payload.choreos).length+'개'):'전체 장르'}</span></div>;
 })}</>;
}
export default function DanceFlowKpi({featured=[],onToggleFeatured}){
 const {session,payload,loading,error,refresh}=useDance();
 const [genre,setGenre]=useState('all');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[authError,setAuthError]=useState('');
 const genres=useMemo(()=>[...new Set([...asList(payload?.genres),...asList(payload?.moves).map(x=>x.genre),...asList(payload?.choreos).map(x=>x.genre)].filter(Boolean))],[payload]);
 const results=useMemo(()=>countDanceKpis(payload,genre),[payload,genre]);
 const login=async e=>{e.preventDefault();if(!dance)return;setBusy(true);setAuthError('');const {error}=await dance.auth.signInWithPassword({email,password});setPassword('');setBusy(false);if(error)setAuthError(error.message)};
 return <section className="dance-kpi-panel">
  <div className="dance-kpi-head"><div><strong>Sequence · Dance Flow 동작·안무 KPI</strong><small>전체 장르 합계와 장르별 등록·습득·완성 현황</small></div>{session&&<button type="button" onClick={refresh} title="새로고침" aria-label="새로고침"><RefreshCw size={17}/></button>}</div>
  {!dance?<p className="dance-kpi-error">Dance Flow 연동 설정을 확인해 줘.</p>:!session?<form className="dance-kpi-login" onSubmit={login}><p>Dance Flow 계정으로 로그인해 줘.</p><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Dance Flow 이메일" autoComplete="username"/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"/><button type="submit" disabled={busy}><LogIn size={15}/>{busy?'연결 중…':'Dance Flow 연결'}</button></form>:<>
    <div className="dance-kpi-session"><span>Dance Flow 연결됨</span><button type="button" onClick={()=>dance.auth.signOut()}><LogOut size={15}/> 연결 해제</button></div>
    {loading?<p className="dance-kpi-note">기록을 불러오는 중…</p>:payload?<>
      <div className="dance-kpi-select"><label htmlFor="dance-kpi-genre">장르</label><select id="dance-kpi-genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="all">전체 장르</option>{genres.map(name=><option value={name} key={name}>{name}</option>)}</select></div>
      <div className="dance-kpi-grid">{specs.map(m=><div className="dance-kpi-metric" key={m.id}><div className="dance-kpi-top"><span>{m.label}</span><button type="button" title="대표 KPI 최대 2개" aria-label={m.label+(featured.includes(m.id)?' 대표 KPI 해제':' 대표 KPI 선택')} aria-pressed={featured.includes(m.id)} onClick={()=>onToggleFeatured?.(m.id)}><Star size={19} fill={featured.includes(m.id)?'#9873c8':'none'} color={featured.includes(m.id)?'#9873c8':'#aaa0b3'}/></button></div><strong>{results[m.id].toLocaleString('ko-KR')}</strong><small>{genre==='all'?'전체 장르':genre}</small></div>)}</div>
      <p className="dance-kpi-note">습득 동작은 ‘습득 완료’, 완성 안무는 모든 구간이 ‘완성’인 경우에 집계돼.</p>
      {genre==='all'&&genres.length>0&&<div className="dance-kpi-breakdown"><strong>장르별 현황</strong><div className="dance-kpi-table"><div className="dance-kpi-table-row dance-kpi-table-head"><span>장르</span><span>등록</span><span>습득</span><span>완성</span></div>{genres.map(name=>{const row=countDanceKpis(payload,name);return <div className="dance-kpi-table-row" key={name}><span>{name}</span><span>{row.registered}</span><span>{row.learned}</span><span>{row.completed}</span></div>})}</div></div>}
    </>:<p className="dance-kpi-note">Dance Flow에 서버에 저장된 기록이 없어. 원본 앱에 로그인해 데이터를 동기화해 줘.</p>}
  </>}
  {(error||authError)&&<p className="dance-kpi-error" role="alert">{error||authError}</p>}
 </section>;
}
